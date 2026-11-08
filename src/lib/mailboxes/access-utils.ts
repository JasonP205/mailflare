import type { AppDatabase } from "@/db";

/** Mailbox sharing is always enabled: every paid feature is unlocked on this installation. */
export async function isTeamMailboxSharingEnabled(_db: AppDatabase): Promise<boolean> {
	return true;
}
