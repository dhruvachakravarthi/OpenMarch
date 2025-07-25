import CanvasMarcher from "@/global/classes/canvasObjects/CanvasMarcher";
import Pathway from "@/global/classes/canvasObjects/Pathway";
import Midpoint from "@/global/classes/canvasObjects/Midpoint";
import Endpoint from "@/global/classes/canvasObjects/Endpoint";
import { useMarcherStore } from "@/stores/MarcherStore";
import { useMarcherVisualStore } from "@/stores/MarcherVisualStore";
import Marcher from "@/global/classes/Marcher";
import {
    getSectionAppearance,
    SectionAppearance,
} from "@/global/classes/SectionAppearance";

/**
 * MarcherVisualGroup is a class that contains all the visual elements of a marcher.
 * It includes the pathways, midpoints, and endpoints associated with a marcher_id.
 */
export default class MarcherVisualGroup {
    /** The ID of the marcher this visual is associated with */
    marcherId: number;

    /** Group of selectable visual elements of the marcher */
    canvasMarcher: CanvasMarcher;

    /** Unselectable visual elements of pathways */
    previousPathway: Pathway;
    nextPathway: Pathway;
    previousMidpoint: Midpoint;
    nextMidpoint: Midpoint;
    previousEndPoint: Endpoint;
    nextEndPoint: Endpoint;

    /**
     * Creates a new MarcherVisualGroup instance.
     * @param marcher the marcher this visual group is associated with
     * @param sectionAppearance section appearances to apply to the visuals
     */
    constructor(marcher: Marcher, sectionAppearance?: SectionAppearance) {
        this.marcherId = marcher.id;

        this.canvasMarcher = new CanvasMarcher({
            marcher: marcher,
            coordinate: { x: 0, y: 0 },
            sectionAppearance: sectionAppearance,
        });

        this.previousPathway = new Pathway({
            marcherId: this.marcherId,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            color: "black",
            strokeWidth: 2,
        });
        this.nextPathway = new Pathway({
            marcherId: this.marcherId,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            color: "black",
            strokeWidth: 2,
        });

        this.previousMidpoint = new Midpoint({
            marcherId: this.marcherId,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            innerColor: "black",
            outerColor: "black",
        });
        this.nextMidpoint = new Midpoint({
            marcherId: this.marcherId,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            innerColor: "black",
            outerColor: "black",
        });

        this.previousEndPoint = new Endpoint({
            coordinate: { x: 0, y: 0 },
            marcherId: this.marcherId,
            dotRadius: 3,
            color: "black",
        });
        this.nextEndPoint = new Endpoint({
            coordinate: { x: 0, y: 0 },
            marcherId: this.marcherId,
            dotRadius: 3,
            color: "black",
        });
    }

    // Getters
    getCanvasMarcher() {
        return this.canvasMarcher;
    }
    getPreviousPathway() {
        return this.previousPathway;
    }
    getNextPathway() {
        return this.nextPathway;
    }
    getPreviousMidpoint() {
        return this.previousMidpoint;
    }
    getNextMidpoint() {
        return this.nextMidpoint;
    }
    getPreviousEndpoint() {
        return this.previousEndPoint;
    }
    getNextEndpoint() {
        return this.nextEndPoint;
    }
}

/**
 * Creates a MarcherVisualGroup for each marcher in the receivedMarchers array.
 * Updates existing visuals or creates new ones as needed.
 */
export function marcherVisualsFromMarchers(
    receivedMarchers: Marcher[],
    sectionAppearances?: SectionAppearance[],
): Record<number, MarcherVisualGroup> {
    const newVisuals: Record<number, MarcherVisualGroup> = {};
    for (const marcher of receivedMarchers) {
        const appearance = sectionAppearances
            ? getSectionAppearance(marcher.section, sectionAppearances)
            : undefined;
        newVisuals[marcher.id] = new MarcherVisualGroup(marcher, appearance);
    }
    return newVisuals;
}

/**
 * Fetches marchers and their associated visuals from the store.
 */
export async function fetchMarchersAndVisuals() {
    await useMarcherStore.getState().fetchMarchers();
    const marchers = useMarcherStore.getState().marchers;
    const sectionAppearances = await SectionAppearance.getSectionAppearances();
    await useMarcherVisualStore
        .getState()
        .updateMarcherVisuals(marchers, sectionAppearances);
}

/**
 * Combined store fetch to retrieve marchers and their associated visuals.
 */
export function useMarchersWithVisuals() {
    const marchers = useMarcherStore((state) => state.marchers);
    const marcherVisuals = useMarcherVisualStore(
        (state) => state.marcherVisuals,
    );
    const updateMarcherVisuals = useMarcherVisualStore(
        (state) => state.updateMarcherVisuals,
    );

    return { marchers, marcherVisuals, updateMarcherVisuals };
}
