import { container } from "@sapphire/framework";
import { DatabaseConfig } from "../types/config";
import { DatabaseGuild } from "models/guild";
import mongoose, { Schema, Model, Document } from "mongoose";

const questionSchema = new Schema({
    text: { type: String },
}, { _id: false });

const verificationSchema = new Schema({
    guideChannel: { type: String },
    guideMessage: { type: String },
    verificationQuestions: { type: [questionSchema] },
    verificationLog: { type: String },
    questioningCategory: { type: String },
    questioningChannels: { type: [String] },
    questioningLog: { type: String },
    welcomeChannel: { type: String },
    welcomeMessage: { type: String },
    welcomeToggle: { type: Boolean },
    pendingApplications: { type: [String] },
}, { _id: false });

const rolesSchema = new Schema({
    memberRole: { type: String },
    unverifiedRole: { type: String },
}, { _id: false });

const configSchema = new Schema({
    verification: { type: verificationSchema },
    roles: { type: rolesSchema },
}, { _id: false });

const guildSchema = new Schema<DatabaseGuild>({
    id: { type: String, required: true, unique: true },
    config: { type: configSchema }
});

export type Response = {
    success: boolean;
    message: string;
}

export default class Database {
    private static instance: Database | null = null;

    private config: DatabaseConfig;
    private GuildModel: Model<DatabaseGuild>

    private constructor(config: DatabaseConfig) {
        this.config = config;
        this.GuildModel = mongoose.model("Guild", guildSchema);

        mongoose.set("strictQuery", false);
    }

    /**
     * Create or return an instance of the database
     * @param config The configuration params for creating a new Database object
     * @returns New or existing Database object
     */
    public static getInstance(config?: DatabaseConfig): Database {
        if (!this.instance) {
            if (!config) {
                throw new Error("You must provide the config in order to create a new instance")
            }
            this.instance = new Database(config);
        }

        return this.instance;
    }

    /**
     * Connect to database
     */
    public async connect(): Promise<void> {
        try {
            await mongoose.connect(this.config.url, { dbName: this.config.name });
            container.logger.info("Connected to database");
        } catch (error) {
            container.logger.error("Failed to connect to the database", error);
            throw error;
        }
    }

    /**
     * Return data for a specific guild if it's in the database, if it isn't, create one
     * @param id ID of the guild
     * @returns New or existing guild object
     */
    public async getGuild(id: string): Promise<DatabaseGuild | null> {
        const guild = await this.GuildModel.findOneAndUpdate({ id }, { $setOnInsert: { id } }, { new: true, upsert: true });

        return guild;
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.log("Disconnected from database");
    }

    /**
     * Set the channel where the guide message will be sent
     * @param guildId ID of the guild
     * @param channelId ID of the channel
     * @returns Success or error message
     */
    public async setGuideChannel(guildId: string, channelId: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild" };
        }

        const currentValue = guild.get("config.verification.guildChannel");
        if (currentValue === channelId) {
            return { success: false, message: "The guide channel is already set to that" };
        }

        guild.set("config.verification.guideChannel", channelId);
        try {
            await guild.save();
            return { success: true, message: `Successfully set the guide channel to <#${channelId}>` };
        } catch (error) {
            return { success: false, message: `There was an error setting the guide channel` };
        }
    }

    /**
     * Remove the channel where the guide message will be sent
     * @param guildId ID of the guild
     * @returns Success or error message
     */
    public async removeGuildChannel(guildId: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild" };
        }

        const currentValue = guild.get("config.verification.guildChannel");
        if (!currentValue) {
            return { success: false, message: "The guide channel is already set to that" };
        }

        guild.set("config.verification.guideChannel", undefined);
        try {
            await guild.save();
            return { success: true, message: `Successfully removed the guide channel` };
        } catch (error) {
            return { success: false, message: `There was an error removing the guide channel` };
        }
    }

    /**
     * Set the message that will be posted in the guide channel
     * @param guildId ID of the guild
     * @param message Message that will be sent
     * @returns Success or error message
     */
    public async setGuildMessage(guildId: string, message: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild" };
        }

        const currentValue = guild.get("config.verification.guildMessage");
        if (currentValue === message) {
            return { success: false, message: "The guide message is already set to that" };
        }

        guild.set("config.verification.guildMessage", message);
        try {
            await guild.save();
            return { success: true, message: `Successfully set the guide message to:\n${message}` };
        } catch (error) {
            return { success: false, message: `There was an error setting the guide message` };
        }
    }

    /**
     * Remove the message that will be posted in the guide channel
     * @param guildId ID of the guild
     * @returns Success or error message
     */
    public async removeGuildMessage(guildId: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild" };
        }

        const currentValue = guild.get("config.verification.guildMessage");
        if (!currentValue) {
            return { success: false, message: "The guide channel is already set to that" };
        }

        guild.set("config.verification.guildMessage", undefined);
        try {
            await guild.save();
            return { success: true, message: `Successfully removed the guide message` };
        } catch (error) {
            return { success: false, message: `There was an error remove the guide message` };
        }
    }
}
