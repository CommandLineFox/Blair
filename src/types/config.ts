import { GatewayIntentBits, Partials } from "discord.js";
import { existsSync, readFileSync } from "fs";
import * as dotenv from "dotenv";

export type ClientConfig = {
    token: string;
    owners: string[];
    serverProtectorId: string;
    serverProtectorMessage: string;
};

export type ClientOptions = {
    disableMentions: "all" | "everyone" | "none";
    partials: Partials[];
    intents: GatewayIntentBits[];
    loadMessageCommandListeners: boolean;
};

export type DatabaseConfig = {
    name: string;
    url: string;
};

type FileConfig = {
    bot: Omit<ClientConfig, "token">;
    options: ClientOptions;
};

export class Config {
    private static instance: Config | null = null;

    private clientConfig: ClientConfig;
    private clientOptions: ClientOptions;
    private databaseConfig: DatabaseConfig;

    private constructor(clientConfig: ClientConfig, clientOptions: ClientOptions, databaseConfig: DatabaseConfig) {
        this.clientConfig = clientConfig;
        this.clientOptions = clientOptions;
        this.databaseConfig = databaseConfig;
    }

    /**
     * Create or return an instance of the config
     * @returns New or existing Config object
     */
    public static getInstance(): Config {
        if (!this.instance) {
            dotenv.config();

            const configPath = process.env.CONFIG_PATH;
            if (!configPath) {
                throw new Error("Couldn't find the environment variable for config location");
            }

            if (!existsSync(configPath)) {
                throw new Error("Couldn't find the config.json file");
            }

            const parsedConfig: FileConfig = JSON.parse(readFileSync(configPath, "utf-8"));

            const clientConfig: ClientConfig = { token: process.env.TOKEN ?? "", ...parsedConfig.bot };
            const clientOptions: ClientOptions = parsedConfig.options;
            const databaseConfig: DatabaseConfig = { name: process.env.DB_NAME ?? "", url: process.env.DB_URL ?? "", };

            this.instance = new Config(clientConfig, clientOptions, databaseConfig);
        }

        return this.instance;
    }

    /**
     * Returns the general configuration like token, list of owners, application ID
     * @returns A ClientConfig object
     */
    public getClientConfig(): ClientConfig {
        return this.clientConfig;
    }

    /**
     * Returns the client options for creating the client
     * @returns A ClientOptions object
     */
    public getClientOptions(): ClientOptions {
        return this.clientOptions;
    }

    /**
     * Returns the config for creating the database
     * @returns A DatabaseConfig object
     */
    public getDatabaseConfig(): DatabaseConfig {
        return this.databaseConfig;
    }
}
