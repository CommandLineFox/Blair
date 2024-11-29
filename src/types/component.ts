import Database from "../database/database";
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
export function getGuideComponent(guildId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [verifyButton.setCustomId(`${Buttons.VERIFY_BUTTON}_${guildId}`)] });
}

/**
 * Returns the action row component for the end of the DM verification process
 * @returns ActionRow with the confirm and retry buttons
 */
export function getDmVerificationComponent(guildId: string, userId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [confirmButton.setCustomId(`${Buttons.CONFIRM_BUTTON}_${guildId}_${userId}`), retryButton.setCustomId(`${Buttons.RETRY_BUTTON}_${guildId}_${userId}`)] });
}

/**
 * Returns the action row component for the verification log embeds
 * @returns ActionRow with the approve, question, kick and ban buttons
 */
export function getHandlingComponent(userId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>({ components: [approveButton.setCustomId(`${Buttons.APPROVE_BUTTON}_${userId}`), questionButton.setCustomId(`${Buttons.QUESTION_BUTTON}_${userId}`), kickButton.setCustomId(`${Buttons.KICK_BUTTON}_${userId}`), banButton.setCustomId(`${Buttons.BAN_BUTTON}_${userId}`)] });
}

/**
 * Returns the action row component for ban reasons
 * @param guild The guild that verification is happening in
 * @param verificationLogChannelId The verification log channel ID
 * @param verificationMessageId The message ID of the verification log post
 * @returns ActionRow with the ban reason menu
 */
export async function getBanReasonComponent(guild: Guild, verificationLogChannelId: string, verificationMessageId: string): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const database = Database.getInstance()
    const banReasons = await database.getBanReasons(guild);
    let banMenu = banReasonMenu;
    banMenu.setCustomId(`${Menus.BAN_MENU}_${verificationLogChannelId}_${verificationMessageId}`);

    if (banReasons) {
        for (const reason of banReasons) {
            banMenu.addOptions({ label: reason, value: reason });
        }
    }

    banMenu.addOptions({ label: "Custom", value: "Custom" });

    return new ActionRowBuilder<StringSelectMenuBuilder>({ components: [banMenu] });
}

/**
 * Returns the action row component for kick reasons
 * @param guild The guild that verification is happening in
 * @param verificationLogChannelId The verification log channel ID
 * @param verificationMessageId The message ID of the verification log post
 * @returns ActionRow with the kick reason menu
 */
export async function getKickReasonComponent(guild: Guild, verificationLogChannelId: string, verificationMessageId: string): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const database = Database.getInstance()
    const kickReasons = await database.getKickReasons(guild);

    let kickMenu = kickReasonMenu;
    kickMenu.setCustomId(`${Menus.KICK_MENU}_${verificationLogChannelId}_${verificationMessageId}`);

    if (kickReasons) {
        for (const reason of kickReasons) {
            kickMenu.addOptions(({ label: reason, value: reason }));
        }
    }

    kickMenu.addOptions({ label: "Custom", value: "Custom" });

    return new ActionRowBuilder<StringSelectMenuBuilder>({ components: [kickMenu] });
}