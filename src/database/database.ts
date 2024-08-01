import { container } from "@sapphire/framework";
import { DatabaseConfig } from "../types/config";
import { DatabaseGuild, PendingApplication } from "models/guild";
import mongoose, { Schema, Model, Document } from "mongoose";
import { CategoryChannel, ChannelType, Guild, GuildMember, Role, TextChannel } from "discord.js";
import { trimString } from "utils/utils";

const pendingApplicationSchema = new Schema({
    userId: { type: String },
    requiredApprovers: { type: [String] },
}, { _id: false });

const verificationSchema = new Schema({
    questions: { type: [String] },
    log: { type: String },
    pendingApplications: { type: [pendingApplicationSchema] },
    approvers: { type: [String] },
}, { _id: false });

const questioningSchema = new Schema({
    ongoingCategory: { type: String },
    ongoingChannels: { type: [String] },
    log: { type: String },
}, { _id: false });

const guideSchema = new Schema({
    channel: { type: String },
    message: { type: String },
}, { _id: false });

const welcomeSchema = new Schema({
    channel: { type: String },
    message: { type: String },
    toggle: { type: Boolean },
}, { _id: false });

const rolesSchema = new Schema({
    memberRole: { type: String },
    unverifiedRole: { type: String },
    staffRoles: { type: [String] },
}, { _id: false });

const configSchema = new Schema({
    verification: { type: verificationSchema },
    questioning: { type: questioningSchema },
    guide: { type: guideSchema },
    welcome: { type: welcomeSchema },
    roles: { type: rolesSchema },
}, { _id: false });

const guildSchema = new Schema<DatabaseGuild>({
    id: { type: String, required: true, unique: true },
    config: { type: configSchema }
});

export type Response = {
    success: boolean;
    message: string;
}

export default class Database {
    private static instance: Database | null = null;

    private config: DatabaseConfig;
    private GuildModel: Model<DatabaseGuild>

    private constructor(config: DatabaseConfig) {
        this.config = config;
        this.GuildModel = mongoose.model("Guild", guildSchema);

        mongoose.set("strictQuery", false);
    }

    /**
     * Create or return an instance of the database
     * @param config The configuration params for creating a new Database object
     * @returns New or existing Database object
     */
    public static getInstance(config?: DatabaseConfig): Database {
        if (!this.instance) {
            if (!config) {
                throw new Error("You must provide the config in order to create a new instance")
            }
            this.instance = new Database(config);
        }

        return this.instance;
    }

    /**
     * Connect to database
     */
    public async connect(): Promise<void> {
        try {
            await mongoose.connect(this.config.url, { dbName: this.config.name });
            container.logger.info("Connected to database");
        } catch (error) {
            container.logger.error("Failed to connect to the database", error);
            throw error;
        }
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        container.logger.info("Disconnected from database");
    }

    /**
     * Return data for a specific guild if it's in the database, if it isn't, create one
     * @param id ID of the guild
     * @returns New or existing guild object
     */
    public async getGuild(id: string): Promise<DatabaseGuild | null> {
        const guild = await this.GuildModel.findOneAndUpdate({ id }, { $setOnInsert: { id } }, { new: true, upsert: true });

        return guild;
    }


    /**
     * Set a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param value Value to be assigned
     * @param alreadySetMessage Error message for when a value is already set
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async setValue(guildId: string, databaseLocation: string, value: any, alreadySetMessage: string, successMessage: string, errorMessage: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const currentValue = guild.get(databaseLocation);
        if (currentValue === value) {
            return { success: false, message: alreadySetMessage };
        }

        guild.set(databaseLocation, value);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Unset a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param alreadySetMessage Error message for when a value is already set
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async unsetValue(guildId: string, databaseLocation: string, notSetMessage: string, successMessage: string, errorMessage: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const currentValue = guild.get(databaseLocation);
        if (!currentValue) {
            return { success: false, message: notSetMessage };
        }

        guild.set(databaseLocation, undefined);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Add a value to an array in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param value Value to be assigned
     * @param alreadySetMessage Error message for when a value is already set
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async addToArray(guildId: string, databaseLocation: string, value: any, existsMessage: string, successMessage: string, errorMessage: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        if (array.includes(value)) {
            return { success: false, message: existsMessage };
        }

        array.push(value);
        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Remove a value from an array in the database by value or index
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param valueOrIndex Value to be removed or index of the value to be removed
     * @param isIndex Flag to indicate if the second parameter is an index
     * @param notExistsMessage Error message for when the value or index does not exist
     * @param successMessage Success message
     * @param errorMessage Error message for if the value fails to be removed
     * @returns Response indicating success or failure
     */
    private async removeFromArray(guildId: string, databaseLocation: string, valueOrIndex: any, isIndex: boolean, notExistsMessage: string, successMessage: string, errorMessage: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        let index: number;

        if (isIndex) {
            index = valueOrIndex;
            if (index < 0 || index >= array.length) {
                return { success: false, message: notExistsMessage };
            }
        } else {
            index = array.indexOf(valueOrIndex);
            if (index === -1) {
                return { success: false, message: notExistsMessage };
            }
        }

        array.splice(index, 1);
        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Reposition a value in the database
     * @param guildId ID of the guild
     * @param databaseLocation Location of the object
     * @param oldIndex Old index of the element
     * @param newIndex New index of the element
     * @param successMessage Success message
     * @param errorMessage Eror message for if the value fails to be set
     * @returns Response indicating success or failure
     */
    private async repositionArrayItem(guildId: string, databaseLocation: string, oldIndex: number, newIndex: number, successMessage: string, errorMessage: string): Promise<Response> {
        const guild = await this.getGuild(guildId) as Document | null;
        if (!guild) {
            return { success: false, message: "There was an error fetching the guild." };
        }

        const array = guild.get(databaseLocation) || [];
        if (oldIndex < 0 || oldIndex >= array.length || newIndex < 0 || newIndex >= array.length || oldIndex === newIndex) {
            return { success: false, message: "Invalid index." };
        }

        const [item] = array.splice(oldIndex, 1);
        array.splice(newIndex, 0, item);

        guild.set(databaseLocation, array);
        try {
            await guild.save();
            return { success: true, message: successMessage };
        } catch (error) {
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Set the guide channel
     * @param guildId ID of the guild
     * @param channelId ID of the guide channel
     * @returns Response indicating success or failure
     */
    public setGuideChannel(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.guide.channel", channelId,
            `The guide channel is already set to <#${channelId}.`,
            `Successfully set the guide channel to <#${channelId}>.`,
            "Failed to set the guide channel.");
    }

    /**
     * Remove the guide channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeGuideChannel(guildId: string) {
        return this.unsetValue(guildId, "config.guide.channel",
            "The guide channel is not set.",
            "Successfully removed the guide channel.",
            "Failed to remove the guide channel.");
    }

    /**
     * Set the guide message
     * @param guildId ID of the guild
     * @param messageId ID of the guide message
     * @returns Response indicating success or failure
     */
    public setGuideMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.guide.message", message,
            "The guide message is already set to that.",
            trimString(`Successfully set the guide message to:\n\n${message}`, 4000),
            "Failed to set the guide message.");
    }

    /**
     * Remove the guide message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeGuideMessage(guildId: string) {
        return this.unsetValue(guildId, "config.guide.message",
            "The guide message is not set.",
            "Successfully removed the guide message.",
            "Failed to remove the guide message.");
    }

    /**
     * Set the verification message
     * @param guildId ID of the guild
     * @param messageId ID of the guide message
     * @returns Response indicating success or failure
     */
    public setVerificationMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.verification.message", message,
            "The verification message is already set to that.",
            trimString(`Successfully set the verification message to:\n\n${message}`, 4000),
            "Failed to set the verification message.");
    }

    /**
     * Remove the verification message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationMessage(guildId: string) {
        return this.unsetValue(guildId, "config.verification.message",
            "The verification message is not set.",
            "Successfully removed the verification message.",
            "Failed to remove the verification message.");
    }

    /**
     * Add a verification question to the list
     * @param guildId ID of the guild
     * @param question Verification question to be added
     * @returns Response indicating success or failure
     */
    public addVerificationQuestion(guildId: string, question: string) {
        return this.addToArray(guildId, "config.verification.questions", question,
            "That verification question already exists.",
            `Successfully added "${question}" to the verification questions list.`,
            "Failed to add the verification question.");
    }

    /**
     * Remove a verification question from the list
     * @param guildId ID of the guild
     * @param question Verification question to be removed
     * @returns Response indicating success or failure
     */
    public removeVerificationQuestion(guildId: string, questionIndex: number) {
        return this.removeFromArray(guildId, "config.verification.questions", questionIndex, true,
            "That verification question does not exist.",
            "Successfully removed the question from the verification questions list.",
            "Failed to remove the verification question.");
    }

    /**
     * Reposition a verification question in the list
     * @param guildId ID of the guild
     * @param oldIndex Current index of the verification question
     * @param newIndex New index of the verification question
     * @returns Response indicating success or failure
     */
    public repositionVerificationQuestion(guildId: string, oldIndex: number, newIndex: number) {
        return this.repositionArrayItem(guildId, "config.verification.questions", oldIndex, newIndex,
            "Successfully repositioned the verification question.",
            "Failed to reposition the verification question.");
    }

    /**
     * Set the verification log channel
     * @param guildId ID of the guild
     * @param channelId ID of the verification log channel
     * @returns Response indicating success or failure
     */
    public setVerificationLog(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.verification.log", channelId,
            `The verification log is already set to <#${channelId}>.`,
            `Successfully set the verification log to <#${channelId}>.`,
            "Failed to set the verification log.");
    }

    /**
     * Remove the verification log channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeVerificationLog(guildId: string) {
        return this.unsetValue(guildId, "config.verification.log",
            "The verification log is not set.",
            "Successfully removed the verification log.",
            "Failed to remove the verification log.");
    }

    /**
     * Add an approver to the list
     * @param guildId ID of the guild
     * @param question Approver to be added
     * @returns Response indicating success or failure
     */
    public addVerificationApprover(guildId: string, approver: string) {
        return this.addToArray(guildId, "config.verification.approvers", approver,
            "That approver already exists.",
            `Successfully added <@${approver}> to the verification approvers list.`,
            "Failed to add the verification question.");
    }

    /**
     * Remove an approver from the list
     * @param guildId ID of the guild
     * @param question Approver to be removed
     * @returns Response indicating success or failure
     */
    public removeVerificationApprover(guildId: string, approver: string) {
        return this.removeFromArray(guildId, "config.verification.approvers", approver, false,
            "That approver does not exist.",
            "Successfully removed the user from the verification approvers list.",
            "Failed to remove the verification question.");
    }

    /**
     * Add a pending application to the list
     * @param guildId ID of the guild
     * @param applicationId ID of the pending application
     * @returns Response indicating success or failure
     */
    public addPendingApplication(guildId: string, pendingApplication: PendingApplication) {
        return this.addToArray(guildId, "config.verification.pendingApplications", pendingApplication,
            "The pending application already exists.",
            `Successfully added <@${pendingApplication.userId}> to the pending applications list.`,
            "Failed to add the pending application.");
    }

    /**
     * Remove a pending application from the list
     * @param guildId ID of the guild
     * @param applicationId ID of the pending application
     * @returns Response indicating success or failure
     */
    public removePendingApplication(guildId: string, pendingApplication: PendingApplication) {
        return this.removeFromArray(guildId, "config.verification.pendingApplications", pendingApplication, false,
            "Pending application does not exist.",
            "Successfully removed the user from the pending applications list.",
            "Failed to remove the pending application.");
    }

    /**
     * Set the questioning category
     * @param guildId ID of the guild
     * @param categoryId ID of the questioning category
     * @returns Response indicating success or failure
     */
    public setQuestioningCategory(guildId: string, categoryId: string) {
        return this.setValue(guildId, "config.questioning.ongoingCategory", categoryId,
            `The questioning category is already set to <#${categoryId}>.`,
            `Successfully set the questioning category to <#${categoryId}>.`,
            "Failed to set the questioning category.");
    }

    /**
     * Remove the questioning category
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeQuestioningCategory(guildId: string) {
        return this.unsetValue(guildId, "config.questioning.ongoingCategory",
            "The questioning category is not set.",
            "Successfully removed the Questioning category.",
            "Failed to remove the questioning category.");
    }

    /**
     * Add a questioning channel to the list
     * @param guildId ID of the guild
     * @param channelId ID of the questioning channel
     * @returns Response indicating success or failure
     */
    public addQuestioningChannel(guildId: string, channelId: string) {
        return this.addToArray(guildId, "config.questioning.ongoingChannels", channelId,
            "The questioning channel already exists.",
            `Successfully added<#${channelId}> to the questioning channels list.`,
            "Failed to add the questioning channel.");
    }

    /**
     * Remove a questioning channel from the list
     * @param guildId ID of the guild
     * @param channelId ID of the questioning channel
     * @returns Response indicating success or failure
     */
    public removeQuestioningChannel(guildId: string, channelId: string) {
        return this.removeFromArray(guildId, "config.questioning.ongoingChannels", channelId, false,
            "The questioning channel does not exist.",
            "Successfully removed the channel from the questioning channels list.",
            "Failed to remove the questioning channel.");
    }

    /**
     * Set the questioning log channel
     * @param guildId ID of the guild
     * @param channelId ID of the questioning log channel
     * @returns Response indicating success or failure
     */
    public setQuestioningLog(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.questioning.log", channelId,
            `The questioning log is already set to <#${channelId}>.`,
            `Successfully set the questioning log to <#${channelId}>.`,
            "Failed to set the questioning log.");
    }

    /**
     * Remove the questioning log channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeQuestioningLog(guildId: string) {
        return this.unsetValue(guildId, "config.questioning.log",
            "The questioning log is not set.",
            "Successfully removed the questioning log.",
            "Failed to remove the questioning log.");
    }

    /**
     * Set the welcome channel
     * @param guildId ID of the guild
     * @param channelId ID of the welcome channel
     * @returns Response indicating success or failure
     */
    public setWelcomeChannel(guildId: string, channelId: string) {
        return this.setValue(guildId, "config.welcome.channel", channelId,
            `The welcome channel is already set to <#${channelId}>.`,
            `Successfully set the Welcome channel to <#${channelId}>.`,
            "Failed to set the welcome channel.");
    }

    /**
     * Remove the welcome channel
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeWelcomeChannel(guildId: string) {
        return this.unsetValue(guildId, "config.welcome.channel",
            "The welcome channel is not set.",
            "Successfully removed the Welcome channel.",
            "Failed to remove the welcome channel.");
    }

    /**
     * Set the welcome message
     * @param guildId ID of the guild
     * @param message Welcome message to be set
     * @returns Response indicating success or failure
     */
    public setWelcomeMessage(guildId: string, message: string) {
        return this.setValue(guildId, "config.welcome.message", message,
            "The welcome message is already set to that.",
            trimString(`Successfully set the welcome messageto to:\n\n${message}`, 4000),
            "Failed to set the welcome message.");
    }

    /**
     * Remove the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeWelcomeMessage(guildId: string) {
        return this.unsetValue(guildId, "config.welcome.message",
            "The welcome message is not set.",
            "Successfully removed the welcome message.",
            "Failed to remove the welcome message.");
    }

    /**
     * Enable the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public enableWelcomeToggle(guildId: string) {
        return this.setValue(guildId, "config.welcome.toggle", true,
            "The welcome toggle is already enabled.",
            "Successfully enabled the welcome toggle.",
            "Failed to enable the welcome toggle.");
    }

    /**
     * Disable the welcome message
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public disableWelcomeToggle(guildId: string) {
        return this.setValue(guildId, "config.welcome.toggle", false,
            "The welcome toggle is already disabled.",
            "Successfully disabled the welcome toggle.",
            "Failed to disable the welcome toggle.");
    }

    /**
     * Set the member role
     * @param guildId ID of the guild
     * @param roleId ID of the member role
     * @returns Response indicating success or failure
     */
    public setMemberRole(guildId: string, roleId: string) {
        return this.setValue(guildId, "config.roles.memberRole", roleId,
            `The member role is already set to <@&${roleId}>`,
            `Successfully set the member role to <@&${roleId}>`,
            "Failed to set the member role.");
    }

    /**
     * Remove the member role
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeMemberRole(guildId: string) {
        return this.unsetValue(guildId, "config.roles.memberRole",
            "The member role is not set.",
            "Successfully removed the member role.",
            "Failed to remove the member role.");
    }

    /**
     * Set the unverified role
     * @param guildId ID of the guild
     * @param roleId ID of the unverified role
     * @returns Response indicating success or failure
     */
    public setUnverifiedRole(guildId: string, roleId: string) {
        return this.setValue(guildId, "config.roles.unverifiedRole", roleId,
            `The unverified role is already set to <@&${roleId}>.`,
            `Successfully set the unverified role to <@&${roleId}>.`,
            "Failed to set the unverified role.");
    }

    /**
     * Remove the unverified role
     * @param guildId ID of the guild
     * @returns Response indicating success or failure
     */
    public removeUnverifiedRole(guildId: string) {
        return this.unsetValue(guildId, "config.roles.unverifiedRole",
            "The unverified role is not set.",
            "Successfully removed the unverified role.",
            "Failed to remove the unverified role.");
    }

    /**
     * Add a staff role to the list
     * @param guildId ID of the guild
     * @param roleId ID of the role
     * @returns Response indicating success or failure
     */
    public addStaffRole(guildId: string, roleId: string): Promise<Response> {
        return this.addToArray(guildId, "config.roles.staffRoles", roleId,
            "The staff role already exists",
            `Successfully added <@&${roleId}> to the staff roles list.`,
            "Failed to add the staff role.");
    }

    /**
     * Remove a staff role from the list
     * @param guildId ID of the guild
     * @param roleId ID of the role
     * @returns Response indicating success or failure
     */
    public removeStaffRole(guildId: string, roleId: string): Promise<Response> {
        return this.removeFromArray(guildId, "config.roles.staffRoles", roleId, false,
            "The staff role does not exist.",
            `Successfully removed <@&${roleId}> from the staff roles list`,
            "Failed to remove the staff role.");
    }

    /**
     * Get the guide channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getGuideChannel(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const guideChannel = dbGuild?.config?.guide?.channel;
        if (!guideChannel) {
            return null;
        }

        const channel = await guild.channels.fetch(guideChannel);
        if (!channel) {
            await this.removeGuideChannel(guideChannel);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeGuideChannel(guideChannel);
            return null;
        }

        return channel;
    }

    /**
     * Get the guide message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getGuideMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const guideMessage = dbGuild?.config?.guide?.message;
        if (!guideMessage) {
            return null;
        }

        return guideMessage;
    }

    /**
     * Get the verification message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getVerificationMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationMessage = dbGuild?.config?.verification?.message;
        if (!verificationMessage) {
            return null;
        }

        return verificationMessage;
    }

    /**
     * Get the verification questions for a specified guild
     * @param guild The guild to search in
     * @returns The array of strings if found or nothing
     */
    public async getVerificationQuestions(guild: Guild): Promise<string[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationQuestions = dbGuild?.config?.verification?.questions;
        if (!verificationQuestions) {
            return null;
        }

        return verificationQuestions;
    }

    /**
     * Get the verification log channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getVerificationLog(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const verificationLog = dbGuild?.config?.verification?.log;
        if (!verificationLog) {
            return null;
        }

        const channel = await guild.channels.fetch(verificationLog);
        if (!channel) {
            await this.removeVerificationLog(verificationLog);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeVerificationLog(verificationLog);
            return null;
        }

        return channel;
    }

    /**
     * Get the list of verification approvers for a specified guild
     * @param guild The guild to search in
     * @returns The list of approvers if found or nothing
     */
    public async getVerificationApprovers(guild: Guild): Promise<GuildMember[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const approvers = dbGuild?.config?.verification?.approvers;
        if (!approvers) {
            return null;
        }

        const approverList = [];
        for (const approverId of approvers) {
            const member = await guild.members.fetch(approverId);
            if (!member) {
                continue;
            }
            approverList.push(member);
        }

        if (approverList.length === 0) {
            return null;
        }

        return approverList;
    }

    /**
     * Get the questioning category for a specified guild
     * @param guild The guild to search in
     * @returns The category if found or nothing
     */
    public async getQuestioningCategory(guild: Guild): Promise<CategoryChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const questioningCategory = dbGuild?.config?.questioning?.ongoingCategory;
        if (!questioningCategory) {
            return null;
        }

        const channel = await guild.channels.fetch(questioningCategory);
        if (!channel) {
            await this.removeQuestioningCategory(questioningCategory);
            return null;
        }

        if (channel.type !== ChannelType.GuildCategory) {
            await this.removeQuestioningCategory(questioningCategory);
            return null;
        }

        return channel;
    }

    /**
     * Get the questioning channels list for a specified guild
     * @param guild The guild to search in
     * @returns The list of channels if found or nothing
     */
    public async getQuestioningChannels(guild: Guild): Promise<TextChannel[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const questioningChannels = dbGuild?.config?.questioning?.ongoingChannels;
        if (!questioningChannels) {
            return null;
        }

        const channelList = [];
        for (const questioningChannel of questioningChannels) {
            const channel = await guild.channels.fetch(questioningChannel);
            if (!channel) {
                await this.removeQuestioningChannel(guild.id, questioningChannel);
                continue;
            }

            if (channel.type !== ChannelType.GuildText) {
                await this.removeQuestioningChannel(guild.id, questioningChannel);
                continue;
            }

            channelList.push(channel);
        }

        if (channelList.length === 0) {
            return null;
        }

        return channelList;
    }

    /**
     * Get the questioning log channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getQuestioningLog(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const questioningLog = dbGuild?.config?.questioning?.log;
        if (!questioningLog) {
            return null;
        }

        const channel = await guild.channels.fetch(questioningLog);
        if (!channel) {
            await this.removeQuestioningLog(questioningLog);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeQuestioningLog(questioningLog);
            return null;
        }

        return channel;
    }

    /**
     * Get the welcome channel for a specified guild
     * @param guild The guild to search in
     * @returns The channel if found or nothing
     */
    public async getWelcomeChannel(guild: Guild): Promise<TextChannel | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeChannel = dbGuild?.config?.welcome?.channel;
        if (!welcomeChannel) {
            return null;
        }

        const channel = await guild.channels.fetch(welcomeChannel);
        if (!channel) {
            await this.removeWelcomeChannel(welcomeChannel);
            return null;
        }

        if (channel.type !== ChannelType.GuildText) {
            await this.removeWelcomeChannel(welcomeChannel);
            return null;
        }

        return channel;
    }

    /**
     * Get the welcome message for a specified guild
     * @param guild The guild to search in
     * @returns The string if found or nothing
     */
    public async getWelcomeMessage(guild: Guild): Promise<string | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeMessage = dbGuild?.config?.welcome?.message;
        if (!welcomeMessage) {
            return null;
        }

        return welcomeMessage;
    }

    /**
     * Get the welcome toggle for a specified guild
     * @param guild The guild to search in
     * @returns The boolean if found or false
     */
    public async getWelcomeToggle(guild: Guild): Promise<Boolean | null> {
        const dbGuild = await this.getGuild(guild.id);
        const welcomeToggle = dbGuild?.config?.welcome?.toggle;
        if (!welcomeToggle) {
            return false;
        }

        return welcomeToggle;
    }

    /**
     * Get the list of pending application members for a specified guild
     * @param guild The guild to search in
     * @returns The list of members if found or nothing
     */
    public async getPendingApplications(guild: Guild): Promise<PendingApplication[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const pendingApplications = dbGuild?.config?.verification?.pendingApplications;
        if (!pendingApplications) {
            return null;
        }

        const pendingApplicationList = [];
        for (const pendingApplication of pendingApplications) {
            if (!pendingApplication.userId) {
                await this.removePendingApplication(guild.id, pendingApplication);
                continue;
            }

            const member = await guild.members.fetch(pendingApplication.userId);
            if (!member) {
                await this.removePendingApplication(guild.id, pendingApplication);
                continue;
            }

            pendingApplicationList.push(pendingApplication);
        }

        if (pendingApplicationList.length === 0) {
            return null;
        }

        return pendingApplicationList;
    }

    /**
     * Get the member role for a specified guild
     * @param guild The guild to search in
     * @returns The role if found or nothing
     */
    public async getMemberRole(guild: Guild): Promise<Role | null> {
        const dbGuild = await this.getGuild(guild.id);
        const memberRole = dbGuild?.config?.roles?.memberRole;
        if (!memberRole) {
            return null;
        }

        const role = await guild.roles.fetch(memberRole);
        if (!role) {
            await this.removeMemberRole(memberRole);
            return null;
        }

        return role;
    }

    /**
     * Get the unverified role for a specified guild
     * @param guild The guild to search in
     * @returns The role if found or nothing
     */
    public async getUnverifiedRole(guild: Guild): Promise<Role | null> {
        const dbGuild = await this.getGuild(guild.id);
        const unverifiedRole = dbGuild?.config?.roles?.unverifiedRole;
        if (!unverifiedRole) {
            return null;
        }

        const role = await guild.roles.fetch(unverifiedRole);
        if (!role) {
            await this.removeUnverifiedRole(unverifiedRole);
            return null;
        }

        return role;
    }

    /**
     * Get the list of staff roles for a specified guild
     * @param guild The guild to search in
     * @returns The list of roles if found or nothing
     */
    public async getStaffRoles(guild: Guild): Promise<Role[] | null> {
        const dbGuild = await this.getGuild(guild.id);
        const staffRoles = dbGuild?.config?.roles?.staffRoles;
        if (!staffRoles) {
            return null;
        }

        const roleList = [];
        for (const staffRole of staffRoles) {
            const role = await guild.roles.fetch(staffRole);
            if (!role) {
                await this.removeStaffRole(guild.id, staffRole);
                continue;
            }

            roleList.push(role);
        }

        if (roleList.length === 0) {
            return null;
        }

        return roleList;
    }
}