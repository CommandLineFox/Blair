import { GatewayIntentBits, Partials } from "discord.js";
import { existsSync, readFileSync } from "fs";

export type ClientConfig = {
    token: string;
    owners: string[];
}

export type ClientOptions = {
    disableMentions: "all" | "everyone" | "none";
    partials: Partials[];
    intents: GatewayIntentBits[];
    loadMessageCommandListeners: boolean;
};

export type DatabaseConfig = {
    name: string;
    url: string;
}

type FileConfig = {
    bot: ClientConfig;
    options: ClientOptions;
    database: DatabaseConfig;
}

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
     * @param file The file path where the config.json is for reading a new config
     * @returns New or existing Config object
     */
    public static getInstance(file?: string): Config {
        if (!this.instance) {
            if (!file) {
                throw new Error("You must provide the file path for ");
            }

            if (!existsSync(file)) {
                throw new Error("Couldn't find the config file");
            }

            const parsedConfig: FileConfig = JSON.parse(readFileSync(file).toString())

            const clientConfig: ClientConfig = parsedConfig.bot;
            const clientOptions: ClientOptions = parsedConfig.options;
            const databaseConfig: DatabaseConfig = parsedConfig.database;

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