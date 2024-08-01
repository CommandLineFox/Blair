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

export function getDmVerificationComponent(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [confirmButton, retryButton] });
}