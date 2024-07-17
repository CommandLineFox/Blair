import { SapphireClient } from '@sapphire/framework';
import { getRootData } from '@sapphire/pieces';
import type { ClientOptions } from 'discord.js';
import { join } from 'node:path';

export class BotClient extends SapphireClient {
    private rootData = getRootData();

    public constructor(options: ClientOptions) {
        super(options);

        this.stores.registerPath(join(this.rootData.root, 'verification'));
    }
}