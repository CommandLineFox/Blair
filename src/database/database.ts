import { container } from "@sapphire/framework";
import { DatabaseConfig } from "../types/config";
import { DatabaseGuild } from "./models/guild";
import mongoose, { Schema, Model } from "mongoose";

const guildSchema = new Schema<DatabaseGuild>({
    id: { type: String, required: true, unique: true },
});

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
        let guild = await this.GuildModel.findOne({ id });
        if (!guild) {
            guild = new this.GuildModel({ id });
            await guild.save();
        }

        return guild;
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.log("Disconnected from database");
    }
}