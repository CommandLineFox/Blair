import {ActionRowBuilder, MessageActionRowComponentBuilder} from "discord.js";

export type CustomResponse = {
    success: boolean;
    message: string;
    components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}