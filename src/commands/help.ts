import { Command } from '@sapphire/framework';
import { Message } from 'discord.js';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: 'Lists all available commands',
            preconditions: ['OwnerOnly']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        interaction.reply({ content: "Help" });
    }

    public override async messageRun(message: Message) {
        message.reply({ content: "Help" });
    }
}

//On hold til I figure out a way to actually list subcommands