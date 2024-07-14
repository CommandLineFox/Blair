import { SapphireClient } from "@sapphire/framework";
import {Config} from "./types/config";
import Database from "./database/database";

async function main(): Promise<void> {
    const config = Config.getInstance("config.json");
    const database = Database.getInstance(config.getDatabaseConfig());
    database.connect();

    const client = new SapphireClient(config.getClientOptions());
    client.login(config.getClientConfig().token);
}

main();