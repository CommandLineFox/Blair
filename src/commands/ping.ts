import { Command } from '@sapphire/framework';
import { Message } from 'discord.js';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            description: 'Check if the bot is responsive',
            detailedDescription: "Check if the bot is responsive",
            preconditions: ['OwnerOnly', 'UptimeCheck']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            { idHints: ["1310732668266217472"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: "Pong" });
    }

    public override async messageRun(message: Message): Promise<void> {
        await message.reply({ content: "Pong" });
    }
}