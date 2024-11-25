import { Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChannelType, Message, PermissionFlagsBits, TextBasedChannel } from 'discord.js';
import { CustomResponse } from '../types/customResponse';

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "echo",
            description: 'Echo',
            detailedDescription: "Echo",
            requiredUserPermissions: [PermissionFlagsBits.Administrator],
            runIn: CommandOptionsRunTypeEnum.GuildText
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription("The message to echo")
                        .setRequired(true)
                ),
            { idHints: ["1310732664600268922"] }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const messageContent = interaction.options.getString('message', true);
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.channel) {
            await interaction.editReply({ content: "Couldn't find the channel" });
            return;
        }

        const result = await this.echo(interaction.channel, messageContent);
        await interaction.editReply({ content: result.message });
    }

    public override async messageRun(message: Message, args: Args) {
        const messageContent = await args.rest("string");

        if (!messageContent) {
            return;
        }

        await message.delete();
        await this.echo(message.channel, messageContent);
    }

    /**
     * Repeat a message into the channel the command is run in
     * @param channel The channel to send the message in
     * @param message The message
     * @returns Success or error to be sent as ephemeral message for the slash command
     */
    private async echo(channel: TextBasedChannel, message: string): Promise<CustomResponse> {
        if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM) {
            return { success: false, message: "Can't run in DMs" };
        }

        const bot = channel.guild.members.me;
        if (!bot) {
            return { success: false, message: "Couldn't find the bot" };
        }

        const permissions = channel.permissionsFor(bot);
        if (!permissions?.has(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel)) {
            return { success: false, message: "The bot doesn't have permission to see or send messages in this channel" };
        }

        await channel.sendTyping();

        try {
            await channel.send(message);
            return { success: true, message: "Successfully sent" };
        } catch {
            return { success: false, message: "Failed to send the message" };
        }
    }
}