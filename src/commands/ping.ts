import { Command } from '@sapphire/framework';
import { Message } from 'discord.js';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            description: 'Check if the bot is responsive',
            detailedDescription: "Check if the bot is responsive",
            preconditions: ['OwnerOnly']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            { idHints: ["1310732668266217472"] }
        );
    }

    public override chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        interaction.reply({ content: "Pong" });
    }

    public override messageRun(message: Message) {
        message.reply({ content: "Pong" });
    }
}