import { ApplicationCommandRegistries, Command } from '@sapphire/framework';
import { EmbedBuilder, Guild, Message, PermissionFlagsBits } from 'discord.js';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: 'List all available commands',
            detailedDescription: "List all available commands",
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
            { idHints: ["1310732666542231613"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const embed = await this.createHelpEmbed(interaction.guild!);
        await interaction.editReply({ embeds: [embed] });
    }

    public override async messageRun(message: Message): Promise<void> {
        const embed = await this.createHelpEmbed(message.guild!);
        await message.reply({ embeds: [embed] });
    }

    private async createHelpEmbed(guild: Guild): Promise<EmbedBuilder> {
        const helpEmbed = new EmbedBuilder()
            .setTitle(`List of commands for ${guild.name}`)
            .setColor("Yellow")
            .setTimestamp();

        const registries = ApplicationCommandRegistries.registries;
        for (const [_, registry] of registries) {
            if (!registry.command) {
                continue;
            }

            if (helpEmbed.data.fields?.length === 25) {
                continue;
            }

            const fieldName = registry.command.name;
            const fieldValue = `${registry.command.detailedDescription}`.trim();
            helpEmbed.addFields({ name: fieldName, value: fieldValue });
        }

        return helpEmbed;
    }
}