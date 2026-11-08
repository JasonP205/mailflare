import { authFetch } from "@/lib/auth/client";
import type { BrandingFormResponse } from "./types";

export const BRANDING_ICON_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** App icons are shown at 16–192 px; 256 px keeps them sharp on high-density screens. */
const BRANDING_ICON_EDGE = 256;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks the icon in the browser before upload, so the Worker only stores a small
 * file instead of parsing a multi-megabyte form body (which can hit the Worker's CPU limit).
 * Falls back to the original file when the browser cannot decode or re-encode it.
 */
export async function optimizeBrandingIcon(source: File): Promise<File> {
	let image: ImageBitmap;
	try {
		image = await createImageBitmap(source);
	} catch {
		return source;
	}
	try {
		const scale = Math.min(1, BRANDING_ICON_EDGE / Math.max(image.width, image.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(image.width * scale));
		canvas.height = Math.max(1, Math.round(image.height * scale));
		const context = canvas.getContext("2d");
		if (!context) return source;
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = "high";
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		// WebP keeps transparency and is small; browsers without a WebP encoder return PNG.
		const blob = (await canvasToBlob(canvas, "image/webp", 0.9)) ?? (await canvasToBlob(canvas, "image/png"));
		if (!blob || !BRANDING_ICON_ACCEPT.split(",").includes(blob.type)) return source;
		if (blob.size >= source.size && scale === 1) return source;
		const extension = blob.type === "image/webp" ? "webp" : "png";
		return new File([blob], `app-icon.${extension}`, { type: blob.type });
	} finally {
		image.close();
	}
}

export async function saveBranding(appName: string, icon: File | null): Promise<BrandingFormResponse> {
	const form = new FormData();
	form.set("appName", appName);
	if (icon) {
		const optimized = await optimizeBrandingIcon(icon);
		form.set("icon", optimized, optimized.name);
	}
	const response = await authFetch("/api/branding", { method: "PUT", body: form });
	const data = (await response.json().catch(() => ({ error: `Unable to save branding (HTTP ${response.status})` }))) as BrandingFormResponse;
	if (!response.ok) throw new Error(data.error ?? "Unable to save branding");
	return data;
}
