import { Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Message, PermissionFlagsBits } from 'discord.js';
import { CustomResponse } from '../../types/customResponse';
import Database from '../../database/database';

export class ClearCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "clear",
            description: 'Removes a pending application',
            detailedDescription: "Removes a pending application",
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName("user")
                        .setDescription("ID of user to remove the pending application of")
                        .setRequired(true)
                ),
            { idHints: ["1310732494290555033"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.options.getString('user', true);

        const result = await this.removePendingApp(userId, interaction.guildId!);
        await interaction.editReply({ content: result.message });
    }

    public override async messageRun(message: Message, args: Args): Promise<void> {
        const userId = await args.rest("string");

        if (!userId) {
            await message.reply("Couldn't find the argument");
            return;
        }

        const result = await this.removePendingApp(userId, message.guildId!);
        await message.reply({ content: result.message });
    }

    private async removePendingApp(userId: string, guildId: string): Promise<CustomResponse> {
        const database = Database.getInstance();

        return await database.removePendingApplication(userId, guildId);
    }
}

//On hold til I figure out a way to actually list subcommands