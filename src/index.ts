import BotClient from "client";
import { Database } from "database/database";
import { getConfig } from "utils/utils";

async function main(): Promise<void> {
    const configFile = getConfig("config.json");
    if (!configFile) {
        return;
    }

    const database = new Database(configFile.database);
    const client = new BotClient(configFile.config, database, configFile.options);

    client.login(configFile.config.token);
}

main();