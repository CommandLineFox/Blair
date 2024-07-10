import { SapphireClient } from "@sapphire/framework";
import { Database } from "database/database";
import { ClientConfig, ClientOptions } from "types/types";

export default class BotClient extends SapphireClient {
    private readonly config: ClientConfig;
    private readonly database: Database;

    public constructor(config: ClientConfig, database: Database, options: ClientOptions) {
        super(options);
        this.config = config;
        this.database = database;
    }

    getConfig() {
        return this.config;
    }

    getDatabase() {
        return this.database;
    }
}