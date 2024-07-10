import { GatewayIntentBits, Partials } from "discord.js";

export type ClientConfig = {
    token: string;
    owners: string[];
}

export type ClientOptions = {
    disableMentions: "all" | "everyone" | "none";
    partials: Partials[];
    intents: GatewayIntentBits[];
};

export type DatabaseConfig = {
    name: string;
    url: string
}

export type Config = {
    config: ClientConfig;
    options: ClientOptions;
    database: DatabaseConfig;
}

export interface DatabaseGuild {
    id: string;
}