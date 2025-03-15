import {Precondition, Result, UserError} from '@sapphire/framework';
import type {Client, CommandInteraction, ContextMenuCommandInteraction, Message} from 'discord.js';
import {getRemainingUptime} from '../utils/utils';

export class UptimeCheckPrecondition extends Precondition {
    public override async messageRun(message: Message): Promise<Result<unknown, UserError>> {
        return await this.checkUptime(message.client);
    }

    public override async chatInputRun(interaction: CommandInteraction): Promise<Result<unknown, UserError>> {
        return await this.checkUptime(interaction.client);
    }

    public override async contextMenuRun(interaction: ContextMenuCommandInteraction): Promise<Result<unknown, UserError>> {
        return await this.checkUptime(interaction.client);
    }

    /**
     * Check if the bot's uptime is more than 5 minutes
     * @returns Result success if uptime is valid; otherwise, an error
     */
    private async checkUptime(client: Client): Promise<Result<unknown, UserError>> {
        const remainingTime = getRemainingUptime(client);

        return (remainingTime === null) ? this.ok() : this.error({ message: `The bot is still warming up! Please wait ${Math.ceil(remainingTime / 1000)} more seconds.` });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        UptimeCheck: never;
    }
}
