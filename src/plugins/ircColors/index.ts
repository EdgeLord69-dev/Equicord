/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings, Settings } from "@api/Settings";
import { getCustomColorString } from "@equicordplugins/customUserColors";
import { hash as h64 } from "@intrnl/xxhash64";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { useMemo } from "@webpack/common";

// Calculate a CSS color string based on the user ID
function calculateNameColorForUser(id?: string) {
    const { lightness } = settings.use(["lightness"]);
    const idHash = useMemo(() => id ? h64(id) : null, [id]);

    return idHash && `hsl(${idHash % 360n}, 100%, ${lightness}%)`;
}

const settings = definePluginSettings({
    lightness: {
        description: "Lightness, in %. Change if the colors are too light or too dark",
        type: OptionType.NUMBER,
        default: 70,
    },
    memberListColors: {
        description: "Replace role colors in the member list",
        restartNeeded: true,
        type: OptionType.BOOLEAN,
        default: true
    },
    applyColorOnlyToUsersWithoutColor: {
        description: "Apply colors only to users who don't have a predefined color",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    },
    applyColorOnlyInDms: {
        description: "Apply colors only in direct messages; do not apply colors in servers.",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    authors: [Devs.Grzesiek11, Devs.jamesbt365],
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(?<=\.username.{0,50}?)style:/,
                replace: "style:{color:$self.calculateNameColorForMessageContext(arguments[0])},_style:"
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(?<=roleName:\i,)color:/,
                replace: "color:$self.calculateNameColorForListContext(arguments[0]),originalColor:"
            },
            predicate: () => settings.store.memberListColors
        }
    ],

    calculateNameColorForMessageContext(context: any) {
        const userId: string | undefined = context?.message?.author?.id;
        const colorString = context?.author?.colorString;
        const color = calculateNameColorForUser(userId);
        const customColor = userId && Settings.plugins.CustomUserColors.enabled ? getCustomColorString(userId, true) : null;

        // Color preview in role settings
        if (context?.message?.channel_id === "1337" && userId === "313337")
            return customColor ?? colorString;

        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) {
            return customColor ?? colorString;
        }

        if (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString) {
            return customColor ?? color;
        } else {
            return customColor ?? colorString;
        }
    },
    calculateNameColorForListContext(context: any) {
        const id = context?.user?.id;
        const colorString = context?.colorString;
        const color = calculateNameColorForUser(id);
        const customColor = id && Settings.plugins.CustomUserColors.enabled ? getCustomColorString(id, true) : null;

        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) {
            return customColor ?? colorString;
        }

        if (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString) {
            return customColor ?? color;
        } else {
            return customColor ?? colorString;
        }
    }
});
