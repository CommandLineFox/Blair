import Database from "database/database";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild, StringSelectMenuBuilder } from "discord.js";

export enum Buttons {
    VERIFY_BUTTON = "verify",
    CONFIRM_BUTTON = "confirm",
    RETRY_BUTTON = "retry",
    APPROVE_BUTTON = "approve",
    QUESTION_BUTTON = "question",
    KICK_BUTTON = "kick",
    BAN_BUTTON = "ban"
}

export enum Menus {
    KICK_MENU = "kick",
    BAN_MENU = "ban"
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

const approveButton = new ButtonBuilder()
    .setCustomId(Buttons.APPROVE_BUTTON)
    .setLabel("Approve")
    .setStyle(ButtonStyle.Success);

const questionButton = new ButtonBuilder()
    .setCustomId(Buttons.QUESTION_BUTTON)
    .setLabel("Question")
    .setStyle(ButtonStyle.Primary);

const kickButton = new ButtonBuilder()
    .setCustomId(Buttons.KICK_BUTTON)
    .setLabel("Kick")
    .setStyle(ButtonStyle.Danger);

const banButton = new ButtonBuilder()
    .setCustomId(Buttons.BAN_BUTTON)
    .setLabel("Ban")
    .setStyle(ButtonStyle.Danger);

const banReasonMenu = new StringSelectMenuBuilder()
    .setCustomId(Menus.BAN_MENU)
    .setMinValues(1)
    .setMaxValues(1);

const kickReasonMenu = new StringSelectMenuBuilder()
    .setCustomId(Menus.KICK_MENU)
    .setMinValues(1)
    .setMaxValues(1);

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

/**
 * Returns the action row component for the verification log embeds
 * @returns ActionRow with the approve, question, kick and ban buttons
 */
export function getHandlingComponent(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [approveButton, questionButton, kickButton, banButton] });
}

/**
 * Returns the action row component for ban reasons
 * @param guild The guild that verification is happening in
 * @param messageId The message ID of the verification log post
 * @returns ActionRow with the ban reason menu
 */
export async function getBanReasonComponent(guild: Guild, messageId: string): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const database = Database.getInstance()
    const banReasons = await database.getKickReasons(guild);
    let banMenu = banReasonMenu;
    banMenu.setCustomId(Menus.BAN_MENU + "_" + messageId);

    if (banReasons) {
        for (const reason of banReasons) {
            banMenu.addOptions({ label: reason, value: reason });
        }

        banMenu.addOptions({ label: "Custom", value: "Custom" });
    }
    return new ActionRowBuilder<StringSelectMenuBuilder>({ components: [banMenu] });
}

/**
 * Returns the action row component for kick reasons
 * @param guild The guild that verification is happening in
 * @param messageId The message ID of the verification log post
 * @returns ActionRow with the kick reason menu
 */
export async function getKickReasonComponent(guild: Guild, messageId: string): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const database = Database.getInstance()
    const kickReasons = await database.getKickReasons(guild);

    let kickMenu = kickReasonMenu;
    kickMenu.setCustomId(Menus.KICK_MENU + "_" + messageId);

    if (kickReasons) {
        for (const reason of kickReasons) {
            kickMenu.addOptions(({ label: reason, value: reason }));
        }

        kickMenu.addOptions({ label: "Custom", value: "Custom" });
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>({ components: [kickMenu] });
}