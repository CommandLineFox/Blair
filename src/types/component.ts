import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export enum Buttons {
    VERIFY_BUTTON = "verify",
    CONFIRM_BUTTON = "confirm",
    RETRY_BUTTON = "retry"
}

const verifyButton = new ButtonBuilder()
    .setCustomId(Buttons.VERIFY_BUTTON)
    .setLabel("Verify")
    .setStyle(ButtonStyle.Primary);

const confirmButton = new ButtonBuilder()
    .setCustomId(Buttons.CONFIRM_BUTTON)
    .setLabel("Confirm")
    .setStyle(ButtonStyle.Success);

const retryButton = new ButtonBuilder()
    .setCustomId(Buttons.RETRY_BUTTON)
    .setLabel("Retry")
    .setStyle(ButtonStyle.Danger);

/**
 * Returns the action row component for the guide message
 * @returns ActionRow with the verify button
 */
export function getGuideComponent(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [verifyButton] });
}

/**
 * Returns the action row component for the end of the DM verification process
 * @returns ActionRow with the confirm and retry buttons
 */
export function getDmVerificationComponent(guildId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [confirmButton.setCustomId(Buttons.CONFIRM_BUTTON + "_" + guildId), retryButton.setCustomId(Buttons.RETRY_BUTTON + "_" + guildId)] });
}