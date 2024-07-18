import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const verifyButton = new ButtonBuilder()
    .setCustomId("verify")
    .setLabel("Verify")
    .setStyle(ButtonStyle.Primary);

/**
 * Returns the action row component for the guide message
 * @returns ActionRow with the verify button
 */
export function getGuideComponent(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [verifyButton] });
}