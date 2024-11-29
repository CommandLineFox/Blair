import { Precondition, Result, UserError } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { Config } from "../types/config";

export class OwnerOnlyPrecondition extends Precondition {
    public override async messageRun(message: Message): Promise<Result<unknown, UserError>> {
        // for Message Commands
        return await this.checkOwner(message.author.id);
    }

    public override async chatInputRun(interaction: CommandInteraction): Promise<Result<unknown, UserError>> {
        // for Slash Commands
        return await this.checkOwner(interaction.user.id);
    }

    public override async contextMenuRun(interaction: ContextMenuCommandInteraction): Promise<Result<unknown, UserError>> {
        // for Context Menu Command
        return await this.checkOwner(interaction.user.id);
    }

    /**
     * Check if the user running a command falls under the list of owners
     * @param userId The ID of the user
     * @returns Nothing if the user is an owner otherwise an error
     */
    private async checkOwner(userId: string): Promise<Result<unknown, UserError>> {
        const clientConfig = Config.getInstance().getClientConfig();
        return clientConfig.owners.includes(userId) ? this.ok() : this.error({ message: 'Only the bot owner can use this command!' });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}