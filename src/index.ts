import {Config} from "./types/config";
import Database from "./database/database";
import {BotClient} from "./types/client";

async function main(): Promise<void> {
    const config = Config.getInstance();
    const database = Database.getInstance(config.getDatabaseConfig());

    await database.connect();
    await database.removePendingApplication("399624330268508162", "671258196811448320")

    const client = new BotClient(config.getClientOptions());

    try {
        await client.login(config.getClientConfig().token);
    } catch (error) {
        console.error('Error logging in:', error);
    }
}

main();