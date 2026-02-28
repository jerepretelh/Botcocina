import { useEffect, useRef } from 'react';
import { SubStep, Screen } from '../../types';

interface UseThermomixVoiceProps {
    voiceEnabled: boolean;
    setVoiceEnabled: (enabled: boolean) => void;
    voiceStatus: string;
    setVoiceStatus: (status: string) => void;
    screen: Screen;
    currentStepIndex: number;
    currentSubStepIndex: number;
    currentSubStep: SubStep | null;
    flipPromptVisible: boolean;
    stirPromptVisible: boolean;
    isRetirarSubStep: boolean;
    retirarTitle: string;
    retirarMessage: string;
    effectiveReminderTitle: string;
    effectiveReminderMessage: string;
}

export function useThermomixVoice({
    voiceEnabled,
    setVoiceEnabled,
    setVoiceStatus,
    screen,
    currentStepIndex,
    currentSubStepIndex,
    currentSubStep,
    flipPromptVisible,
    stirPromptVisible,
    isRetirarSubStep,
    retirarTitle,
    retirarMessage,
    effectiveReminderTitle,
    effectiveReminderMessage,
}: UseThermomixVoiceProps) {
    const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const ttsRequestIdRef = useRef(0);
    const intentionalCancelRef = useRef(false);
    const lastSpeechRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });

    useEffect(() => {
        if (!speechSupported) return;

        const loadVoices = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            voicesRef.current = loadedVoices;
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [speechSupported]);

    useEffect(() => {
        return () => {
            if (!speechSupported) return;
            window.speechSynthesis.cancel();
        };
    }, [speechSupported]);

    const speakInstruction = (text: string, force = false) => {
        if (!speechSupported || (!voiceEnabled && !force) || !text.trim()) return;

        const now = Date.now();
        if (!force && lastSpeechRef.current.text === text && now - lastSpeechRef.current.ts < 900) {
            return;
        }
        lastSpeechRef.current = { text, ts: now };

        const synth = window.speechSynthesis;
        const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
        voicesRef.current = voices;
        const requestId = ++ttsRequestIdRef.current;
        let settled = false;
        let started = false;

        const resetSynth = () => {
            intentionalCancelRef.current = true;
            synth.cancel();
            synth.resume();
            setTimeout(() => {
                intentionalCancelRef.current = false;
            }, 260);
        };

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        const preferredVoice =
            voices.find((voice) => voice.default && voice.localService) ??
            voices.find((voice) => voice.default) ??
            voices.find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('es')) ??
            voices.find((voice) => voice.lang.toLowerCase().startsWith('es')) ??
            voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
            null;
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.lang = preferredVoice.lang;
        }

        utterance.onstart = () => {
            if (requestId !== ttsRequestIdRef.current) return;
            started = true;
            setVoiceStatus(`Reproduciendo voz${utterance.lang ? ` (${utterance.lang})` : ''}`);
        };
        utterance.onend = () => {
            if (requestId !== ttsRequestIdRef.current) return;
            settled = true;
            setVoiceStatus('Última lectura completada');
        };
        utterance.onerror = (event) => {
            if (requestId !== ttsRequestIdRef.current) return;
            const errorCode = event.error || 'desconocido';
            if (errorCode === 'canceled' && intentionalCancelRef.current) {
                return;
            }
            settled = true;
            setVoiceStatus(`Error TTS final: ${errorCode}`);
        };

        if (synth.speaking || synth.pending) {
            resetSynth();
        } else {
            synth.resume();
        }
        setTimeout(() => {
            if (requestId !== ttsRequestIdRef.current) return;
            synth.speak(utterance);
        }, 70);

        setTimeout(() => {
            if (requestId !== ttsRequestIdRef.current || settled || started) return;
            synth.pause();
            synth.resume();
            setVoiceStatus('TTS bloqueado: sin respuesta del motor de voz');
        }, 2200);
    };

    const speakCurrentInstruction = (force = false) => {
        if (screen !== 'cooking') return;
        if (flipPromptVisible) {
            speakInstruction('Voltea el huevo. Continúa con el lado B.', force);
            return;
        }
        if (stirPromptVisible) {
            speakInstruction(`${effectiveReminderTitle}. ${effectiveReminderMessage}`, force);
            return;
        }

        const title = isRetirarSubStep ? retirarTitle : currentSubStep?.subStepName;
        if (!title) return;

        const detail = isRetirarSubStep ? retirarMessage : currentSubStep?.notes;
        const text = detail && !detail.startsWith('Cantidad') ? `${title}. ${detail}` : title;
        speakInstruction(text, force);
    };

    useEffect(() => {
        if (!voiceEnabled) return;
        speakCurrentInstruction();
    }, [voiceEnabled, screen, currentStepIndex, currentSubStepIndex, flipPromptVisible, stirPromptVisible]);

    const handleVoiceToggle = () => {
        if (!speechSupported) return;

        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            setVoiceEnabled(false);
            return;
        }

        setVoiceEnabled(true);
        setTimeout(() => {
            speakCurrentInstruction(true);
        }, 50);
    };

    return {
        speechSupported,
        handleVoiceToggle,
        speakCurrentInstruction,
        speakInstruction,
    };
}
