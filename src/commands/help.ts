import {ApplicationCommandRegistries, Command} from '@sapphire/framework';
import {EmbedBuilder, Guild, Message, MessageFlags} from 'discord.js';
import {fetchMember, isStaff} from "../utils/utils";
git
export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: 'List all available commands',
            detailedDescription: "List all available commands",
            preconditions: ['UptimeCheck']
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
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const embed = await this.createHelpEmbed(interaction.guild!, interaction.user.id);
        if (!embed) {
            await interaction.editReply("Only staff members can interact with this");
            return;
        }

        await interaction.editReply({ embeds: [embed] });
    }

    public override async messageRun(message: Message): Promise<void> {
        const embed = await this.createHelpEmbed(message.guild!, message.author.id);
        if (!embed) {
            await message.reply("Only staff members can interact with this");
            return;
        }

        await message.reply({ embeds: [embed] });
    }

    private async createHelpEmbed(guild: Guild, staffMemberId: string): Promise<EmbedBuilder | null> {
        const staffmemberMember = await fetchMember(guild, staffMemberId);
        if (!staffmemberMember) {
            return null;
        }

        const staffCheck = await isStaff(staffmemberMember);
        if (!staffCheck) {
            return null;
        }

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