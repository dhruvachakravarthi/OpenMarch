import { useEffect, useRef } from "react";

export interface Beat {
    id: number;
    position: number;
    duration: number; // seconds to next beat
    includeInMeasure: boolean;
    notes: string | null;
    index: number;
    timestamp: number;
}

interface MetronomeProps {
    beats: Beat[];
    isPlaying: boolean;
    volume?: number;
    clickFreq?: number;
    onTick?: (beat: Beat, beatIdx: number) => void;
}

function playClick(volume = 0.5, freq = 1250) {
    try {
        const ctx = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
            ctx.close();
        };
    } catch (err) {
        // Ignore errors (e.g. user gesture not performed yet)
    }
}

/**
 * Metronome schedules clicks for the given Beat[] whenever isPlaying is true.
 * When beats or isPlaying changes, resets and starts from the beginning.
 */
export function Metronome({
    beats,
    isPlaying,
    volume = 0.5,
    clickFreq = 1250,
    onTick,
}: MetronomeProps) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const beatIdxRef = useRef<number>(0);

    // Clean up any scheduled timeouts when unmounted or when beats/play state changes
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!isPlaying || beats.length === 0) {
            // Stop metronome
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
            beatIdxRef.current = 0;
            return;
        }

        // Start at the first beat
        beatIdxRef.current = 0;
        // Function to play the next click
        const playBeat = () => {
            const idx = beatIdxRef.current;
            if (idx >= beats.length) return;
            const beat = beats[idx];
            playClick(volume, clickFreq);
            if (onTick) onTick(beat, idx);
            // Schedule next beat if there is one
            if (idx < beats.length - 1) {
                timeoutRef.current = setTimeout(
                    playBeat,
                    beats[idx].duration * 1000 - 0.02,
                );
                beatIdxRef.current += 1;
            }
        };
        // Play the first click immediately
        playBeat();

        // Cleanup if beats or isPlaying changes
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        };
    }, [beats, isPlaying, volume, clickFreq, onTick]);

    return null;
}

export default Metronome;
