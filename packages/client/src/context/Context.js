import React, { useState, useEffect, useContext, createContext } from 'react';

import useSignalProcessing from '../hooks/useSignalProcessing';
import useRecording from '../hooks/useRecording';

import { useFaceMesh } from '../hooks/useFaceMesh';
import useVideoRef from '../hooks/useVideoRef';
import { avgFrequency } from '../utils/avgFrequency';



// Create individual contexts
const SettingsContext = createContext();
const DataContext = createContext();
const VideoContext = createContext();
const ChewingFrequencyContext = createContext();

// Custom hooks to use individual contexts
export const useSettings = () => useContext(SettingsContext);
export const useData = () => useContext(DataContext);
export const useVideo = () => useContext(VideoContext);
export const useChewingFrequency = () => useContext(ChewingFrequencyContext);



// Control Panel Provider
export const ContextProvider = ({ children }) => {
    // set up states and hooks as before...
    const videoRef = useVideoRef();
    const [itemsNo, setItemsNo] = useState(160);
    const [chewingFrequency, setChewingFrequency] = useState(null);
    const [cutOffFrequency, setCutOffFrequency] = useState(0.5);

    // Include the useSignalProcessing logic and state in the provider
    const { animate, euclideanDistance, eyePoint, namedKeypoints } = useFaceMesh(videoRef);
   
    const signalProcessingData = useSignalProcessing(animate, eyePoint, euclideanDistance, cutOffFrequency, itemsNo);

    const { recording, toggleRecording, save, timeElapsed } = useRecording(euclideanDistance, signalProcessingData.newFilteredItem, signalProcessingData.filteredPeaks);

    useEffect(() => {
        setChewingFrequency(avgFrequency(signalProcessingData.filteredPeaks, 5));
    }, [animate]);

    const settingsValue = {
        itemsNo,
        setItemsNo,
        cutOffFrequency,
        setCutOffFrequency,
        recording,
        toggleRecording,
        save,
        timeElapsed,
    };

    const dataValue = {
        data: signalProcessingData.data,
        filteredData: signalProcessingData.filteredData,
        filteredPeaks: signalProcessingData.filteredPeaks,
        removedPeaks: signalProcessingData.removedPeaks,
        euclideanDistance,
        eyePointDistance: signalProcessingData.eyePointDistance
    };

    const videoValue = {
        videoRef,
        eyePoint,
        namedKeypoints,
    };

    const chewingFrequencyValue = {
        chewingFrequency: chewingFrequency
    };

    return (
        <SettingsContext.Provider value={settingsValue}>
            <DataContext.Provider value={dataValue}>
                <VideoContext.Provider value={videoValue}>
                        <ChewingFrequencyContext.Provider value={chewingFrequencyValue}>
                            {children}
                        </ChewingFrequencyContext.Provider>
                </VideoContext.Provider>
            </DataContext.Provider>
        </SettingsContext.Provider>
    );
};