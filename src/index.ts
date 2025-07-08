import {Config} from "./types/config";
import Database from "./database/database";
import {BotClient} from "./types/client";

async function main(): Promise<void> {
    const config = Config.getInstance();
    const database = Database.getInstance(config.getDatabaseConfig());

    await database.connect();

    const client = new BotClient(config.getClientOptions());

    try {
        await client.login(config.getClientConfig().token);
    } catch (error) {
        console.error('Error logging in:', error);
    }
}

main();