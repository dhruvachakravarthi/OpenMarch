import { useFieldProperties } from "@/context/fieldPropertiesContext";
import { useSelectedMarchers } from "@/context/SelectedMarchersContext";
import { useSelectedPage } from "@/context/SelectedPageContext";
import { useMarcherPageStore } from "@/stores/MarcherPageStore";
import { useUiSettingsStore } from "@/stores/UiSettingsStore";
import { useCallback, useEffect, useRef } from "react";
import * as CoordinateActions from "./CoordinateActions";
import MarcherPage from "@/global/classes/MarcherPage";
import { getNextPage, getPreviousPage } from "@/global/classes/Page";
import { useIsPlaying } from "@/context/IsPlayingContext";
import { useRegisteredActionsStore } from "@/stores/RegisteredActionsStore";
import { useMarcherStore } from "@/stores/MarcherStore";
import { useSelectedAudioFile } from "@/context/SelectedAudioFileContext";
import AudioFile from "@/global/classes/AudioFile";
import { useAlignmentEventStore } from "@/stores/AlignmentEventStore";
import { MarcherShape } from "@/global/classes/canvasObjects/MarcherShape";
import OpenMarchCanvas from "@/global/classes/canvasObjects/OpenMarchCanvas";
import { useShapePageStore } from "@/stores/ShapePageStore";
import { toast } from "sonner";
import { useTimingObjectsStore } from "@/stores/TimingObjectsStore";
import { useMarchersWithVisuals } from "@/global/classes/MarcherVisualGroup";
import tolgee from "@/global/singletons/Tolgee";
import { useTolgee } from "@tolgee/react";

/**
 * The interface for the registered actions. This exists so it is easy to see what actions are available.
 */
export enum RegisteredActionsEnum {
    // Electron interactions
    launchLoadFileDialogue = "launchLoadFileDialogue",
    launchSaveFileDialogue = "launchSaveFileDialogue",
    launchNewFileDialogue = "launchNewFileDialogue",
    launchInsertAudioFileDialogue = "launchInsertAudioFileDialogue",
    launchImportMusicXmlFileDialogue = "launchImportMusicXmlFileDialogue",
    performUndo = "performUndo",
    performRedo = "performRedo",

    // Navigation and playback
    nextPage = "nextPage",
    lastPage = "lastPage",
    previousPage = "previousPage",
    firstPage = "firstPage",
    playPause = "playPause",

    // Batch editing
    setAllMarchersToPreviousPage = "setAllMarchersToPreviousPage",
    setSelectedMarchersToPreviousPage = "setSelectedMarchersToPreviousPage",
    setAllMarchersToNextPage = "setAllMarchersToNextPage",
    setSelectedMarchersToNextPage = "setSelectedMarchersToNextPage",

    // Alignment
    snapToNearestWhole = "snapToNearestWhole",
    lockX = "lockX",
    lockY = "lockY",
    alignVertically = "alignVertically",
    alignHorizontally = "alignHorizontally",
    evenlyDistributeHorizontally = "evenlyDistributeHorizontally",
    evenlyDistributeVertically = "evenlyDistributeVertically",
    swapMarchers = "swapMarchers",
    moveSelectedMarchersUp = "moveSelectedMarchersUp",
    moveSelectedMarchersDown = "moveSelectedMarchersDown",
    moveSelectedMarchersLeft = "moveSelectedMarchersLeft",
    moveSelectedMarchersRight = "moveSelectedMarchersRight",

    // UI settings
    toggleNextPagePaths = "toggleNextPagePaths",
    togglePreviousPagePaths = "togglePreviousPagePaths",
    focusCanvas = "focusCanvas",
    focusTimeline = "focusTimeline",

    // Cursor Mode
    applyQuickShape = "applyQuickShape",
    createMarcherShape = "createMarcherShape",
    deleteMarcherShape = "deleteMarcherShape",
    cancelAlignmentUpdates = "cancelAlignmentUpdates",
    alignmentEventDefault = "alignmentEventDefault",
    alignmentEventLine = "alignmentEventLine",

    // Select
    selectAllMarchers = "selectAllMarchers",
}

/**
 * THIS SHOULD NOT BE USED DIRECTLY. Use the RegisteredActionsEnum and RegisteredActionsObjects instead.
 *
 * A RegisteredAction is a uniform object to represent a function in OpenMarch.
 * RegisteredActions can be triggered by a keyboard shortcut or by registering
 * a button ref to the RegisteredActionsStore.
 *
 * Use the getRegisteredAction function to get the RegisteredAction object for a given action.
 */
export class RegisteredAction {
    /** The KeyboardShortcut to trigger the action */
    readonly keyboardShortcut?: KeyboardShortcut;
    /** The translation key for the description of the action. Also used for the instructional string
     * E.g. "actions.alignment.lockX" */
    readonly descKey: string;
    /** The translation key for toggle on state (only relevant for toggle-based actions)
     * E.g. "actions.alignment.lockXOn" */
    readonly toggleOnKey?: string;
    /** The translation key for toggle off state (only relevant for toggle-based actions)
     * E.g. "actions.alignment.lockXOff" */
    readonly toggleOffKey?: string;
    /** The string representation of the action. E.g. "lockX" */
    readonly enumString: string;

    /**
     *
     * @param keyboardShortcut The keyboard shortcut to trigger the action. Optional.
     * @param descKey The translation key for the description of the action. "actions.alignment.lockX"
     * @param toggleOnKey The translation key for toggle on state. Optional.
     * @param toggleOffKey The translation key for toggle off state. Optional.
     */
    constructor({
        keyboardShortcut,
        descKey,
        toggleOnKey,
        toggleOffKey,
        enumString,
    }: {
        keyboardShortcut?: KeyboardShortcut;
        descKey: string;
        action?: () => any;
        toggleOnKey?: string;
        toggleOffKey?: string;
        enumString: string;
    }) {
        this.keyboardShortcut = keyboardShortcut;
        this.descKey = descKey;
        this.toggleOnKey = toggleOnKey;
        this.toggleOffKey = toggleOffKey;

        if (
            !Object.values(RegisteredActionsEnum).includes(
                enumString as RegisteredActionsEnum,
            )
        )
            console.error(`Invalid enumString: ${enumString}. This should be a RegisteredActionsEnum value.
        \nRegistered action for "${descKey}" will not be registered to buttons.`);
        this.enumString = enumString;
    }

    /**
     * Get the translated description with optional keyboard shortcut
     */
    getInstructionalString(): string {
        const keyString = this.keyboardShortcut
            ? ` [${this.keyboardShortcut.toString()}]`
            : "";
        return tolgee.t(this.descKey) + keyString;
    }

    /**
     * Get the translated toggle on string with optional keyboard shortcut
     */
    getInstructionalStringToggleOn(): string {
        const keyString = this.keyboardShortcut
            ? ` [${this.keyboardShortcut.toString()}]`
            : "";
        const key = this.toggleOnKey || this.descKey;
        return tolgee.t(key) + keyString;
    }

    /**
     * Get the translated toggle off string with optional keyboard shortcut
     */
    getInstructionalStringToggleOff(): string {
        const keyString = this.keyboardShortcut
            ? ` [${this.keyboardShortcut.toString()}]`
            : "";
        const key = this.toggleOffKey || this.descKey;
        return tolgee.t(key) + keyString;
    }
}

/**
 * A KeyboardShortcut is a combination of a key and modifiers that can trigger an action.
 */
class KeyboardShortcut {
    /** The key to press to trigger the action (not case sensitive). E.g. "q" */
    readonly key: string;
    /** True if the control key needs to be held down (Command in macOS)*/
    readonly control: boolean;
    /** True if the alt key needs to be held down (option in macOS) */
    readonly alt: boolean;
    /** True if the shift key needs to be held down */
    readonly shift: boolean;

    constructor({
        key,
        control = false,
        alt = false,
        shift = false,
    }: {
        key: string;
        control?: boolean;
        alt?: boolean;
        shift?: boolean;
    }) {
        this.key = key.toLowerCase();
        this.control = control;
        this.alt = alt;
        this.shift = shift;
    }

    /**
     * Returns a string representation of the key and modifiers.
     * @returns The string representation of the key and modifiers. E.g. "Ctrl + Shift + Q"
     */
    toString() {
        const keyStr = this.key === " " ? "Space" : this.key.toUpperCase();
        return `${this.control ? "Ctrl + " : ""}${this.alt ? "Alt + " : ""}${
            this.shift ? "Shift + " : ""
        }${keyStr}`;
    }

    /**
     * Returns true if the shortcut's keys are equal. (including control, alt, and shift keys)
     * @param action The action to compare
     * @returns True if the shortcut's keys are equal
     */
    equal(action: KeyboardShortcut) {
        return (
            this.key === action.key &&
            this.control === action.control &&
            this.alt === action.alt &&
            this.shift === action.shift
        );
    }
}

/**
 * Details for all the registered actions.
 * This is useful for getting the details of a registered action at compile time.
 *
 * When adding a new action, use a translation key and translate it in the i18n files or on Tolgee.
 * The translation key should be in the format "actions.{category}.{action}".
 */
export const RegisteredActionsObjects: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [key in RegisteredActionsEnum]: RegisteredAction;
} = {
    // Electron interactions
    launchLoadFileDialogue: new RegisteredAction({
        descKey: "actions.file.loadDialogue",
        enumString: "launchLoadFileDialogue",
    }),
    launchSaveFileDialogue: new RegisteredAction({
        descKey: "actions.file.saveDialogue",
        enumString: "launchSaveFileDialogue",
    }),
    launchNewFileDialogue: new RegisteredAction({
        descKey: "actions.file.newDialogue",
        enumString: "launchNewFileDialogue",
    }),
    launchInsertAudioFileDialogue: new RegisteredAction({
        descKey: "actions.file.insertAudio",
        enumString: "launchInsertAudioFileDialogue",
    }),
    launchImportMusicXmlFileDialogue: new RegisteredAction({
        descKey: "actions.file.importMusicXml",
        enumString: "launchImportMusicXmlFileDialogue",
    }),
    performUndo: new RegisteredAction({
        descKey: "actions.edit.undo",
        enumString: "performUndo",
    }),
    performRedo: new RegisteredAction({
        descKey: "actions.edit.redo",
        enumString: "performRedo",
    }),

    // Navigation and playback
    nextPage: new RegisteredAction({
        descKey: "actions.navigation.nextPage",
        keyboardShortcut: new KeyboardShortcut({ key: "e" }),
        enumString: "nextPage",
    }),
    lastPage: new RegisteredAction({
        descKey: "actions.navigation.lastPage",
        keyboardShortcut: new KeyboardShortcut({ key: "e", shift: true }),
        enumString: "lastPage",
    }),
    previousPage: new RegisteredAction({
        descKey: "actions.navigation.previousPage",
        keyboardShortcut: new KeyboardShortcut({ key: "q" }),
        enumString: "previousPage",
    }),
    firstPage: new RegisteredAction({
        descKey: "actions.navigation.firstPage",
        keyboardShortcut: new KeyboardShortcut({ key: "q", shift: true }),
        enumString: "firstPage",
    }),
    playPause: new RegisteredAction({
        descKey: "actions.playback.playPause",
        toggleOnKey: "actions.playback.play",
        toggleOffKey: "actions.playback.pause",
        keyboardShortcut: new KeyboardShortcut({ key: " " }),
        enumString: "playPause",
    }),

    // Batch editing
    setAllMarchersToPreviousPage: new RegisteredAction({
        descKey: "actions.batchEdit.setAllToPrevious",
        keyboardShortcut: new KeyboardShortcut({
            key: "p",
            shift: true,
            control: true,
        }),
        enumString: "setAllMarchersToPreviousPage",
    }),
    setSelectedMarchersToPreviousPage: new RegisteredAction({
        descKey: "actions.batchEdit.setSelectedToPrevious",
        keyboardShortcut: new KeyboardShortcut({ key: "p", shift: true }),
        enumString: "setSelectedMarchersToPreviousPage",
    }),
    setAllMarchersToNextPage: new RegisteredAction({
        descKey: "actions.batchEdit.setAllToNext",
        keyboardShortcut: new KeyboardShortcut({
            key: "n",
            shift: true,
            control: true,
        }),
        enumString: "setAllMarchersToNextPage",
    }),
    setSelectedMarchersToNextPage: new RegisteredAction({
        descKey: "actions.batchEdit.setSelectedToNext",
        keyboardShortcut: new KeyboardShortcut({ key: "n", shift: true }),
        enumString: "setSelectedMarchersToNextPage",
    }),

    // Marcher movement
    // The following special commands are triggered by WASD/Arrows in handleKeyDown
    moveSelectedMarchersUp: new RegisteredAction({
        descKey: "actions.movement.moveUp",
        keyboardShortcut: new KeyboardShortcut({ key: "" }),
        enumString: "moveSelectedMarchersUp",
    }),
    moveSelectedMarchersDown: new RegisteredAction({
        descKey: "actions.movement.moveDown",
        keyboardShortcut: new KeyboardShortcut({ key: "" }),
        enumString: "moveSelectedMarchersDown",
    }),
    moveSelectedMarchersLeft: new RegisteredAction({
        descKey: "actions.movement.moveLeft",
        keyboardShortcut: new KeyboardShortcut({ key: "" }),
        enumString: "moveSelectedMarchersLeft",
    }),
    moveSelectedMarchersRight: new RegisteredAction({
        descKey: "actions.movement.moveRight",
        keyboardShortcut: new KeyboardShortcut({ key: "" }),
        enumString: "moveSelectedMarchersRight",
    }),

    // Alignment
    snapToNearestWhole: new RegisteredAction({
        descKey: "actions.alignment.snapToWhole",
        keyboardShortcut: new KeyboardShortcut({ key: "1" }),
        enumString: "snapToNearestWhole",
    }),
    lockX: new RegisteredAction({
        descKey: "actions.alignment.lockX",
        toggleOnKey: "actions.alignment.lockXOn",
        toggleOffKey: "actions.alignment.lockXOff",
        keyboardShortcut: new KeyboardShortcut({ key: "y" }),
        enumString: "lockX",
    }),
    lockY: new RegisteredAction({
        descKey: "actions.alignment.lockY",
        toggleOnKey: "actions.alignment.lockYOn",
        toggleOffKey: "actions.alignment.lockYOff",
        keyboardShortcut: new KeyboardShortcut({ key: "x" }),
        enumString: "lockY",
    }),
    alignVertically: new RegisteredAction({
        descKey: "actions.alignment.alignVertically",
        keyboardShortcut: new KeyboardShortcut({ key: "v", alt: true }),
        enumString: "alignVertically",
    }),
    alignHorizontally: new RegisteredAction({
        descKey: "actions.alignment.alignHorizontally",
        keyboardShortcut: new KeyboardShortcut({ key: "h", alt: true }),
        enumString: "alignHorizontally",
    }),
    evenlyDistributeVertically: new RegisteredAction({
        descKey: "actions.alignment.distributeVertically",
        keyboardShortcut: new KeyboardShortcut({ key: "v", shift: true }),
        enumString: "evenlyDistributeVertically",
    }),
    evenlyDistributeHorizontally: new RegisteredAction({
        descKey: "actions.alignment.distributeHorizontally",
        keyboardShortcut: new KeyboardShortcut({ key: "h", shift: true }),
        enumString: "evenlyDistributeHorizontally",
    }),
    swapMarchers: new RegisteredAction({
        descKey: "actions.swap.swap",
        keyboardShortcut: new KeyboardShortcut({ key: "s", control: true }),
        enumString: "swapMarchers",
    }),

    // UI settings
    togglePreviousPagePaths: new RegisteredAction({
        descKey: "actions.ui.togglePreviousPaths",
        toggleOnKey: "actions.ui.showPreviousPaths",
        toggleOffKey: "actions.ui.hidePreviousPaths",
        keyboardShortcut: new KeyboardShortcut({ key: "n" }),
        enumString: "togglePreviousPagePaths",
    }),
    toggleNextPagePaths: new RegisteredAction({
        descKey: "actions.ui.toggleNextPaths",
        toggleOnKey: "actions.ui.showNextPaths",
        toggleOffKey: "actions.ui.hideNextPaths",
        keyboardShortcut: new KeyboardShortcut({ key: "m" }),
        enumString: "toggleNextPagePaths",
    }),
    focusCanvas: new RegisteredAction({
        descKey: "actions.ui.focusCanvas",
        enumString: "focusCanvas",
        keyboardShortcut: new KeyboardShortcut({ key: "c", alt: true }),
    }),
    focusTimeline: new RegisteredAction({
        descKey: "actions.ui.focusTimeline",
        enumString: "focusTimeline",
        keyboardShortcut: new KeyboardShortcut({ key: "t", alt: true }),
    }),

    // Cursor Mode
    applyQuickShape: new RegisteredAction({
        descKey: "actions.shape.applyQuick",
        enumString: "applyQuickShape",
        keyboardShortcut: new KeyboardShortcut({ key: "Enter", shift: true }),
    }),
    createMarcherShape: new RegisteredAction({
        descKey: "actions.shape.create",
        enumString: "createMarcherShape",
        keyboardShortcut: new KeyboardShortcut({ key: "Enter" }),
    }),
    deleteMarcherShape: new RegisteredAction({
        descKey: "actions.shape.delete",
        enumString: "deleteMarcherShape",
        keyboardShortcut: new KeyboardShortcut({ key: "Delete" }),
    }),
    cancelAlignmentUpdates: new RegisteredAction({
        descKey: "actions.alignment.cancelUpdates",
        enumString: "cancelAlignmentUpdates",
        keyboardShortcut: new KeyboardShortcut({ key: "Escape" }),
    }),
    alignmentEventDefault: new RegisteredAction({
        descKey: "actions.cursor.defaultMode",
        enumString: "alignmentEventDefault",
        keyboardShortcut: new KeyboardShortcut({ key: "v" }),
    }),
    alignmentEventLine: new RegisteredAction({
        descKey: "actions.cursor.lineMode",
        enumString: "alignmentEventLine",
        keyboardShortcut: new KeyboardShortcut({ key: "l" }),
    }),

    // Select
    selectAllMarchers: new RegisteredAction({
        descKey: "actions.select.selectAll",
        keyboardShortcut: new KeyboardShortcut({ key: "a", control: true }),
        enumString: "selectAllMarchers",
    }),
} as const;

/**
 * The RegisteredActionsHandler is a component that listens for keyboard shortcuts and button clicks to trigger actions.
 * It is responsible for handling the actions and triggering the appropriate functions.
 *
 * All actions in OpenMarch that can be a keyboard shortcut or a button click should be registered here.
 */
function RegisteredActionsHandler() {
    const { t } = useTolgee();
    const { registeredButtonActions } = useRegisteredActionsStore()!;
    const { marchers, marcherVisuals } = useMarchersWithVisuals();
    const { pages } = useTimingObjectsStore()!;
    const { isPlaying, setIsPlaying } = useIsPlaying()!;
    const { marcherPages } = useMarcherPageStore()!;
    const { selectedPage, setSelectedPage } = useSelectedPage()!;
    const { selectedMarchers, setSelectedMarchers } = useSelectedMarchers()!;
    const { setSelectedAudioFile } = useSelectedAudioFile()!;
    const { fieldProperties } = useFieldProperties()!;
    const { uiSettings, setUiSettings } = useUiSettingsStore()!;
    const { setSelectedMarcherShapes } = useShapePageStore()!;
    const {
        resetAlignmentEvent,
        setAlignmentEvent,
        setAlignmentEventMarchers,
        alignmentEventNewMarcherPages,
        alignmentEventMarchers,
    } = useAlignmentEventStore()!;

    const keyboardShortcutDictionary = useRef<{
        [shortcutKeyString: string]: RegisteredActionsEnum;
    }>({});

    /**
     * Get the MarcherPages for the selected marchers on the selected page.
     */
    const getSelectedMarcherPages = useCallback(() => {
        if (!selectedPage) {
            console.error("No selected page");
            return [];
        }

        const selectedPageMarcherPages =
            marcherPages.marcherPagesByPage[selectedPage.id] || {};
        return selectedMarchers
            .map((marcher) => selectedPageMarcherPages[marcher.id])
            .filter(Boolean);
    }, [marcherPages, selectedMarchers, selectedPage]);

    // Arrow movement defaults
    const snap = useRef(true);
    const distance = useRef(1);

    /**
     * Trigger a RegisteredAction.
     */
    const triggerAction = useCallback(
        (action: RegisteredActionsEnum) => {
            let isElectronAction = true;

            // Check if this is an electron action
            switch (action) {
                case RegisteredActionsEnum.launchLoadFileDialogue:
                    window.electron.databaseLoad();
                    break;
                case RegisteredActionsEnum.launchSaveFileDialogue:
                    window.electron.databaseSave();
                    break;
                case RegisteredActionsEnum.launchNewFileDialogue:
                    window.electron.databaseCreate();
                    break;
                case RegisteredActionsEnum.launchInsertAudioFileDialogue:
                    window.electron.launchInsertAudioFileDialogue().then(() => {
                        AudioFile.getSelectedAudioFile().then((response) => {
                            const selectedAudioFileWithoutAudio = {
                                ...response,
                                data: undefined,
                            };
                            setSelectedAudioFile(selectedAudioFileWithoutAudio);
                        });
                    });
                    break;
                case RegisteredActionsEnum.launchImportMusicXmlFileDialogue:
                    console.log("launchImportMusicXmlFileDialogue");
                    break;
                default:
                    isElectronAction = false;
                    break;
            }

            if (isElectronAction) return;
            if (!selectedPage) {
                console.error("No selected page");
                return;
            }
            if (!fieldProperties) {
                console.error("No field properties");
                return;
            }
            switch (action) {
                /****************** Navigation and playback ******************/
                case RegisteredActionsEnum.launchLoadFileDialogue:
                case RegisteredActionsEnum.launchSaveFileDialogue:
                case RegisteredActionsEnum.launchNewFileDialogue:
                case RegisteredActionsEnum.launchInsertAudioFileDialogue:
                case RegisteredActionsEnum.launchImportMusicXmlFileDialogue:
                    break;
                case RegisteredActionsEnum.performUndo:
                    window.electron.undo();
                    break;
                case RegisteredActionsEnum.performRedo:
                    window.electron.redo();
                    break;
                /****************** Navigation and playback ******************/
                case RegisteredActionsEnum.nextPage: {
                    const nextPage = getNextPage(selectedPage, pages);
                    if (nextPage && !isPlaying) setSelectedPage(nextPage);
                    break;
                }
                case RegisteredActionsEnum.lastPage: {
                    const lastPage = pages[pages.length - 1];
                    if (lastPage && !isPlaying) setSelectedPage(lastPage);
                    break;
                }
                case RegisteredActionsEnum.previousPage: {
                    const previousPage = getPreviousPage(selectedPage, pages);
                    if (previousPage && !isPlaying)
                        setSelectedPage(previousPage);
                    break;
                }
                case RegisteredActionsEnum.firstPage: {
                    const firstPage = pages[0];
                    if (firstPage && !isPlaying) setSelectedPage(firstPage);
                    break;
                }
                case RegisteredActionsEnum.playPause: {
                    const nextPage = getNextPage(selectedPage, pages);
                    if (nextPage) setIsPlaying(!isPlaying);
                    break;
                }

                /****************** Batch Editing ******************/
                case RegisteredActionsEnum.setAllMarchersToPreviousPage: {
                    const previousPage = getPreviousPage(selectedPage, pages);
                    if (!previousPage) {
                        toast.error(t("actions.batchEdit.noPreviousPage"));
                        return;
                    }

                    const previousPageMarcherPages = MarcherPage.getByPageId(
                        marcherPages,
                        previousPage.id,
                    );
                    const changes = previousPageMarcherPages.map(
                        (marcherPage) => ({
                            ...marcherPage,
                            page_id: selectedPage.id,
                        }),
                    );
                    MarcherPage.updateMarcherPages(changes);

                    toast.success(
                        t("actions.batchEdit.setAllToPreviousSuccess", {
                            count: previousPageMarcherPages.length,
                            currentPage: selectedPage.name,
                            previousPage: previousPage.name,
                        }),
                    );
                    break;
                }
                case RegisteredActionsEnum.setSelectedMarchersToPreviousPage: {
                    const previousPage = getPreviousPage(selectedPage, pages);
                    if (!previousPage) {
                        toast.error(t("actions.batchEdit.noPreviousPage"));
                        return;
                    }

                    const previousMarcherPages = selectedMarchers
                        .map((marcher) =>
                            MarcherPage.getByMarcherAndPageId(
                                marcherPages,
                                marcher.id,
                                previousPage.id,
                            ),
                        )
                        .filter(
                            (marcherPage): marcherPage is MarcherPage =>
                                marcherPage !== undefined &&
                                marcherPage.marcher_id !== undefined,
                        );

                    if (previousMarcherPages.length > 0) {
                        const changes = previousMarcherPages.map(
                            (marcherPage) => ({
                                ...marcherPage,
                                page_id: selectedPage.id,
                                marcher_id: marcherPage.marcher_id,
                            }),
                        );
                        MarcherPage.updateMarcherPages(changes);

                        toast.success(
                            t(
                                "actions.batchEdit.setSelectedToPreviousSuccess",
                                {
                                    count: previousMarcherPages.length,
                                    currentPage: selectedPage.name,
                                    previousPage: previousPage.name,
                                },
                            ),
                        );
                    }
                    break;
                }
                case RegisteredActionsEnum.setAllMarchersToNextPage: {
                    const nextPage = getNextPage(selectedPage, pages);
                    if (!nextPage) {
                        toast.error(t("actions.batchEdit.noNextPage"));
                        return;
                    }

                    const nextPageMarcherPages = MarcherPage.getByPageId(
                        marcherPages,
                        nextPage.id,
                    );
                    const changes = nextPageMarcherPages.map((marcherPage) => ({
                        ...marcherPage,
                        page_id: selectedPage.id,
                    }));
                    MarcherPage.updateMarcherPages(changes);

                    toast.success(
                        t("actions.batchEdit.setAllToNextSuccess", {
                            count: nextPageMarcherPages.length,
                            currentPage: selectedPage.name,
                            nextPage: nextPage.name,
                        }),
                    );
                    break;
                }
                case RegisteredActionsEnum.setSelectedMarchersToNextPage: {
                    const nextPage = getNextPage(selectedPage, pages);
                    if (!nextPage) {
                        toast.error(t("actions.batchEdit.noNextPage"));
                        return;
                    }
                    const nextMarcherPages = selectedMarchers
                        .map((marcher) =>
                            MarcherPage.getByMarcherAndPageId(
                                marcherPages,
                                marcher.id,
                                nextPage.id,
                            ),
                        )
                        .filter(
                            (marcherPage): marcherPage is MarcherPage =>
                                marcherPage !== undefined &&
                                marcherPage.marcher_id !== undefined,
                        );

                    if (nextMarcherPages.length > 0) {
                        const changes = nextMarcherPages.map((marcherPage) => ({
                            ...marcherPage,
                            page_id: selectedPage.id,
                            marcher_id: marcherPage.marcher_id,
                        }));
                        MarcherPage.updateMarcherPages(changes);

                        toast.success(
                            t("actions.batchEdit.setSelectedToNextSuccess", {
                                count: nextMarcherPages.length,
                                currentPage: selectedPage.name,
                                nextPage: nextPage.name,
                            }),
                        );
                    }
                    break;
                }

                /******************* Marcher Movement ******************/
                case RegisteredActionsEnum.moveSelectedMarchersUp: {
                    const updatedPagesArray = CoordinateActions.moveMarchersXY({
                        marcherPages: getSelectedMarcherPages(),
                        direction: "up",
                        distance: distance.current,
                        snap: snap.current,
                        fieldProperties: fieldProperties,
                        snapDenominator: 1.0 / distance.current,
                    });
                    MarcherPage.updateMarcherPages(updatedPagesArray);
                    break;
                }
                case RegisteredActionsEnum.moveSelectedMarchersDown: {
                    const updatedPagesArray = CoordinateActions.moveMarchersXY({
                        marcherPages: getSelectedMarcherPages(),
                        direction: "down",
                        distance: distance.current,
                        snap: snap.current,
                        fieldProperties: fieldProperties,
                        snapDenominator: 1.0 / distance.current,
                    });
                    MarcherPage.updateMarcherPages(updatedPagesArray);
                    break;
                }
                case RegisteredActionsEnum.moveSelectedMarchersLeft: {
                    const updatedPagesArray = CoordinateActions.moveMarchersXY({
                        marcherPages: getSelectedMarcherPages(),
                        direction: "left",
                        distance: distance.current,
                        snap: snap.current,
                        fieldProperties: fieldProperties,
                        snapDenominator: 1.0 / distance.current,
                    });
                    MarcherPage.updateMarcherPages(updatedPagesArray);
                    break;
                }
                case RegisteredActionsEnum.moveSelectedMarchersRight: {
                    const updatedPagesArray = CoordinateActions.moveMarchersXY({
                        marcherPages: getSelectedMarcherPages(),
                        direction: "right",
                        distance: distance.current,
                        snap: snap.current,
                        fieldProperties: fieldProperties,
                        snapDenominator: 1.0 / distance.current,
                    });
                    MarcherPage.updateMarcherPages(updatedPagesArray);
                    break;
                }

                /****************** Alignment ******************/
                case RegisteredActionsEnum.snapToNearestWhole: {
                    const roundedCoords = CoordinateActions.getRoundCoordinates(
                        {
                            marcherPages: getSelectedMarcherPages(),
                            fieldProperties: fieldProperties,
                            denominator: 1,
                            xAxis: !uiSettings.lockX,
                            yAxis: !uiSettings.lockY,
                        },
                    );
                    MarcherPage.updateMarcherPages(roundedCoords);
                    break;
                }
                case RegisteredActionsEnum.lockX:
                    setUiSettings(
                        { ...uiSettings, lockX: !uiSettings.lockX },
                        "lockX",
                    );
                    break;
                case RegisteredActionsEnum.lockY:
                    setUiSettings(
                        { ...uiSettings, lockY: !uiSettings.lockY },
                        "lockY",
                    );
                    break;
                case RegisteredActionsEnum.alignVertically: {
                    const alignedCoords = CoordinateActions.alignVertically({
                        marcherPages: getSelectedMarcherPages(),
                    });
                    MarcherPage.updateMarcherPages(alignedCoords);
                    break;
                }
                case RegisteredActionsEnum.alignHorizontally: {
                    const alignedCoords = CoordinateActions.alignHorizontally({
                        marcherPages: getSelectedMarcherPages(),
                    });
                    MarcherPage.updateMarcherPages(alignedCoords);
                    break;
                }
                case RegisteredActionsEnum.evenlyDistributeVertically: {
                    const distributedCoords =
                        CoordinateActions.evenlyDistributeVertically({
                            marcherPages: getSelectedMarcherPages(),
                            fieldProperties,
                        });
                    MarcherPage.updateMarcherPages(distributedCoords);
                    break;
                }
                case RegisteredActionsEnum.evenlyDistributeHorizontally: {
                    const distributedCoords =
                        CoordinateActions.evenlyDistributeHorizontally({
                            marcherPages: getSelectedMarcherPages(),
                            fieldProperties,
                        });
                    MarcherPage.updateMarcherPages(distributedCoords);
                    break;
                }
                case RegisteredActionsEnum.swapMarchers: {
                    if (selectedMarchers.length !== 2) {
                        console.error(
                            "Can only swap 2 marchers. Selected marchers:",
                            selectedMarchers,
                        );
                        toast.error(t("actions.swap.mustSelectTwo"));
                        return;
                    }

                    const marchersStr = `marchers ${selectedMarchers[0].drill_number} and ${selectedMarchers[1].drill_number}`;
                    window.electron
                        .swapMarchers({
                            pageId: selectedPage.id,
                            marcher1Id: selectedMarchers[0].id,
                            marcher2Id: selectedMarchers[1].id,
                        })
                        .then((response) => {
                            if (response.success) {
                                toast.success(
                                    t("actions.swap.success", {
                                        marcher1:
                                            selectedMarchers[0].drill_number,
                                        marcher2:
                                            selectedMarchers[1].drill_number,
                                    }),
                                );
                                MarcherPage.fetchMarcherPages();
                                // This causes an infinite loop
                                // It's not a huge deal to leave it like this as marchers are updated on a refresh
                                MarcherShape.fetchShapePages();
                            } else {
                                const errorMessage =
                                    "Could not swap marchers " + marchersStr;
                                console.error(errorMessage, response.error);
                                toast.error(
                                    t("actions.swap.error", {
                                        marcher1:
                                            selectedMarchers[0].drill_number,
                                        marcher2:
                                            selectedMarchers[1].drill_number,
                                    }),
                                );
                            }
                        });
                    break;
                }

                /****************** UI settings ******************/
                case RegisteredActionsEnum.toggleNextPagePaths:
                    setUiSettings({
                        ...uiSettings,
                        nextPaths: !uiSettings.nextPaths,
                    });
                    break;
                case RegisteredActionsEnum.togglePreviousPagePaths:
                    setUiSettings({
                        ...uiSettings,
                        previousPaths: !uiSettings.previousPaths,
                    });
                    break;
                case RegisteredActionsEnum.focusCanvas:
                    setUiSettings({
                        ...uiSettings,
                        focussedComponent: "canvas",
                    });
                    break;
                case RegisteredActionsEnum.focusTimeline:
                    setUiSettings({
                        ...uiSettings,
                        focussedComponent: "timeline",
                    });
                    break;

                /****************** Cursor Mode ******************/
                case RegisteredActionsEnum.cancelAlignmentUpdates: {
                    if (alignmentEventMarchers.length > 0) {
                        setSelectedMarchers(alignmentEventMarchers);
                        resetAlignmentEvent();
                    } else {
                        // Deselect all shapes and marchers
                        setSelectedMarchers([]);
                        setSelectedMarcherShapes([]);
                    }
                    break;
                }
                case RegisteredActionsEnum.applyQuickShape: {
                    MarcherPage.updateMarcherPages(
                        alignmentEventNewMarcherPages,
                    );
                    resetAlignmentEvent();
                    break;
                }
                case RegisteredActionsEnum.createMarcherShape: {
                    const firstMarcherPage = alignmentEventNewMarcherPages[0];
                    const lastMarcherPage =
                        alignmentEventNewMarcherPages[
                            alignmentEventNewMarcherPages.length - 1
                        ];
                    const marcherIds = alignmentEventNewMarcherPages.map(
                        (marcherPage) => marcherPage.marcher_id,
                    );
                    MarcherShape.createMarcherShape({
                        marcherIds,
                        start: firstMarcherPage,
                        end: lastMarcherPage,
                        pageId: selectedPage.id,
                    });
                    resetAlignmentEvent();
                    break;
                }
                case RegisteredActionsEnum.alignmentEventDefault: {
                    resetAlignmentEvent();
                    break;
                }
                case RegisteredActionsEnum.alignmentEventLine: {
                    if (selectedMarchers.length < 2) {
                        console.error(
                            "Not enough marchers selected to create a line. Need at least 2 marchers selected.",
                        );
                        break;
                    }
                    setAlignmentEvent("line");
                    setAlignmentEventMarchers(selectedMarchers);
                    setSelectedMarchers([]);
                    break;
                }

                /****************** Select ******************/
                case RegisteredActionsEnum.selectAllMarchers: {
                    const canvas = window.canvas as OpenMarchCanvas | undefined;
                    if (!canvas) {
                        break;
                    }

                    canvas.setActiveObjects(canvas.getCanvasMarchers());
                    break;
                }

                default:
                    console.error(`No action registered for "${action}"`);
                    return;
            }
        },
        [
            alignmentEventMarchers,
            alignmentEventNewMarcherPages,
            fieldProperties,
            getSelectedMarcherPages,
            isPlaying,
            marcherPages,
            pages,
            resetAlignmentEvent,
            selectedMarchers,
            selectedPage,
            setAlignmentEvent,
            setAlignmentEventMarchers,
            setIsPlaying,
            setSelectedAudioFile,
            setSelectedMarcherShapes,
            setSelectedMarchers,
            setSelectedPage,
            setUiSettings,
            t,
            uiSettings,
        ],
    );

    /**
     * Create a dictionary of keyboard shortcuts to actions. This is used to trigger actions from keyboard shortcuts.
     */
    useEffect(() => {
        const tempDict: { [shortcutKeyString: string]: RegisteredActionsEnum } =
            {};
        Object.keys(RegisteredActionsEnum).forEach((action) => {
            const keyboardShortcut =
                RegisteredActionsObjects[
                    action as RegisteredActionsEnum
                ].keyboardShortcut?.toString() || undefined;
            // No keyboard shortcut for this action
            if (!keyboardShortcut) return;
            // Check for duplicate keyboard shortcuts
            if (tempDict[keyboardShortcut] !== undefined)
                console.error(
                    `Duplicate keyboard shortcut for \`${keyboardShortcut}\` \nAction: \`${action}\` and \`${tempDict[keyboardShortcut]}\``,
                );
            tempDict[keyboardShortcut] = action as RegisteredActionsEnum;
        });
        keyboardShortcutDictionary.current = tempDict;
    }, []);

    /**
     * Handles the keyboard shortcuts for entire react side of the application.
     */
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (
                uiSettings.focussedComponent === "canvas" &&
                !document.activeElement?.matches(
                    "input, textarea, select, [contenteditable]",
                ) &&
                document.activeElement?.id !== "sentry-feedback" &&
                document.activeElement?.id !== "__tolgee_dev_tools"
            ) {
                // Check the key code and convert it to a key string
                // This must happen rather than using e.key because e.key changes on MacOS with the option key
                const code = e.code;
                let key = e.key;

                // These do not change with the option key
                const ignoredKeys = new Set([
                    "Shift",
                    "Control",
                    "Alt",
                    "Meta",
                    " ",
                    "Enter",
                    "Escape",
                    "ArrowUp",
                    "ArrowDown",
                    "ArrowLeft",
                    "ArrowRight",
                ]);

                // Special handling for WASD/Arrow keys
                if (
                    code === "KeyW" ||
                    code === "KeyA" ||
                    code === "KeyS" ||
                    code === "KeyD" ||
                    code === "ArrowUp" ||
                    code === "ArrowDown" ||
                    code === "ArrowLeft" ||
                    code === "ArrowRight"
                ) {
                    e.preventDefault();

                    // toggle snapping
                    snap.current = !e.altKey && !e.shiftKey;

                    // set distance based on modifiers
                    if (e.metaKey && e.shiftKey && !code.includes("Key")) {
                        distance.current = 0.1;
                    } else if (e.metaKey && !code.includes("Key")) {
                        distance.current = 4;
                    } else if (e.shiftKey) {
                        distance.current = 0.25;
                    } else if (
                        code === "ArrowUp" ||
                        code === "ArrowDown" ||
                        code === "KeyW" ||
                        code === "KeyS"
                    ) {
                        distance.current =
                            uiSettings.coordinateRounding?.nearestYSteps || 1;
                    } else if (
                        code === "ArrowLeft" ||
                        code === "ArrowRight" ||
                        code === "KeyA" ||
                        code === "KeyD"
                    ) {
                        distance.current =
                            uiSettings.coordinateRounding?.nearestXSteps || 1;
                    }

                    // Prevent meta+WASD
                    if (!(e.metaKey && code.includes("Key"))) {
                        // Trigger the action based on the key code
                        switch (code) {
                            case "KeyW":
                            case "ArrowUp":
                                triggerAction(
                                    RegisteredActionsEnum.moveSelectedMarchersUp,
                                );
                                break;
                            case "KeyA":
                            case "ArrowLeft":
                                triggerAction(
                                    RegisteredActionsEnum.moveSelectedMarchersLeft,
                                );
                                break;
                            case "KeyS":
                            case "ArrowDown":
                                triggerAction(
                                    RegisteredActionsEnum.moveSelectedMarchersDown,
                                );
                                break;
                            case "KeyD":
                            case "ArrowRight":
                                triggerAction(
                                    RegisteredActionsEnum.moveSelectedMarchersRight,
                                );
                                break;
                        }
                    }
                }

                // Standard RegisteredAction handling
                if (code.includes("Key")) {
                    key = code.replace("Key", "");
                } else if (code.includes("Digit")) {
                    key = code.replace("Digit", "");
                } else if (!ignoredKeys.has(key)) {
                    console.error(
                        `RegisteredAction Warning: No keyCode handler found for "${code}".`,
                        "This key may not work as expected if using as a registered action shortcut.",
                    );
                    key = e.key;
                }
                const keyboardAction = new KeyboardShortcut({
                    key,
                    control: e.ctrlKey || e.metaKey,
                    alt: e.altKey,
                    shift: e.shiftKey,
                });
                const keyString = keyboardAction.toString();
                if (keyboardShortcutDictionary.current[keyString]) {
                    triggerAction(
                        keyboardShortcutDictionary.current[keyString],
                    );
                    e.preventDefault();
                }
            } else if (e.key === "Escape") {
                setUiSettings({
                    ...uiSettings,
                    focussedComponent: "canvas",
                });
            }
        },
        [setUiSettings, triggerAction, uiSettings],
    );

    /**
     * register the keyboard listener to the window to listen for keyboard shortcuts.
     */
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    /**
     * Register the button refs for the keyboard shortcuts
     */
    useEffect(() => {
        registeredButtonActions.forEach((buttonAction) => {
            if (!buttonAction.buttonRef.current) {
                // console.error(
                //     `No button ref for ${buttonAction.registeredAction}`
                // );
                return;
            }
            buttonAction.buttonRef.current.onclick = () =>
                triggerAction(buttonAction.registeredAction);
        });
    }, [registeredButtonActions, triggerAction]);

    return <></>; // empty fragment
}

export default RegisteredActionsHandler;
