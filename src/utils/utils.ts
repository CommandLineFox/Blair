import { Config } from "types/types";
import { existsSync, readFileSync } from "fs";

export function getConfig(file: string): Config | null {
    if (!existsSync(file)) {
        console.error("Couldn't find the config file");
        return null;
    }

    return JSON.parse(readFileSync(file).toString());
}
