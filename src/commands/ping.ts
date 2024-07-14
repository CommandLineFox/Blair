import { Command } from '@sapphire/framework';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            description: 'Checks if the bot is responsive',
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

    public override chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        interaction.reply({ content: "Pong", ephemeral: true });
    }
}