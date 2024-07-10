import mongoose, { Schema, Model } from "mongoose";
import type { DatabaseConfig, DatabaseGuild } from "types/types";

const guildSchema = new Schema<DatabaseGuild>({
    id: { type: String, required: true, unique: true },
});

export class Database {
    private config: DatabaseConfig;
    private GuildModel: Model<DatabaseGuild>

    public constructor(config: DatabaseConfig) {
        this.config = config;
        this.GuildModel = mongoose.model("Guild", guildSchema);

        mongoose.set("strictQuery", false);
    }

    /**
     * Connect to database
     */
    public async connect(): Promise<void> {
        try {
            await mongoose.connect(this.config.url, { dbName: this.config.name });
            console.log("Connected to database");
        } catch (error) {
            console.error("Failed to connect to the database", error);
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

    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.log("Disconnected from database");
    }
}