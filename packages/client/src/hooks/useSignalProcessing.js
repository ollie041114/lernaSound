import React, { useState, useRef, useEffect, useMemo } from 'react';
import findPeaksP3 from '../utils/findPeaksP3';
import { useControlPanel } from '../components/ControlPanel';

function pointLowPassFilter(prev, newItem, cutoffFreq, sampleRate) {
  const RC = 1 / (2 * Math.PI * cutoffFreq);
  const dt = 1 / sampleRate;
  const alpha = dt / (dt + RC);

  let current = alpha * newItem.value + (1 - alpha) * prev;

  return current;
}

function euclideanDistance(x, y) {
  return Math.sqrt(x * x + y * y);
}

function calculateCorrelation(arr1, arr2, windowSize) {
  if (arr1.length !== arr2.length) {
      console.error("Arrays must have the same length");
      return null;
  }

  const arr1Values = arr1.map(item => item.value);
  const arr2Values = arr2.map(item => item.value);

  const mean = (data) => {
      return data.reduce((a, b) => a + b) / data.length;
  };

  const stdDev = (data, dataMean) => {
      const sqDiff = data.map((item) => Math.pow(item - dataMean, 2));
      return Math.sqrt(sqDiff.reduce((a, b) => a + b) / sqDiff.length);
  };

  const correlationCoefficients = [];

  for (let i = 0; i <= arr1.length - windowSize; i++) {
      const arr1Window = arr1Values.slice(i, i + windowSize);
      const arr2Window = arr2Values.slice(i, i + windowSize);

      const arr1Mean = mean(arr1Window);
      const arr2Mean = mean(arr2Window);

      const arr1StdDev = stdDev(arr1Window, arr1Mean);
      const arr2StdDev = stdDev(arr2Window, arr2Mean);

      let correlationCoefficient = 0;
      for (let j = 0; j < windowSize; j++) {
          correlationCoefficient += ((arr1Window[j] - arr1Mean) * (arr2Window[j] - arr2Mean)) / (arr1StdDev * arr2StdDev);
      }
      correlationCoefficient /= windowSize;

      correlationCoefficients.push({
          value: Math.abs(correlationCoefficient),
          time: arr1[i + Math.floor(windowSize / 2)].time, // use the middle time of the window
      });
  }

  return correlationCoefficients;
}


export default function useSignalProcessing(animate, eyePoint, newItem, cutOffFrequency, itemsNo, windowSize, threshold) {
  const dataRef = useRef({
    data: [],
    filteredData: [],
    herz: 0,
    peaks: [],
    newFilteredItem: null,
    eyePointDistance: [],
    filteredPeaks: [],
    removedPeaks: [],
  });

  useEffect(() => {
    if (!newItem || newItem === undefined) return;

    const updateDataRef = (dataProperty, newValue) => {
      dataRef.current = { ...dataRef.current, [dataProperty]: newValue };
    };

    let data = dataRef.current.data;
    let filteredData = dataRef.current.filteredData;
    let eyePointDistance = dataRef.current.eyePointDistance;

    if (data.length >= 10) {
      let prev;
      if (filteredData.length === 0) {
        prev = data.slice(-1)[0];
      } else {
        prev = filteredData.slice(-1)[0];
      }
      let elapsed = newItem.time.getTime() - prev.time.getTime();
      let herz = 1 / (elapsed / 1000);
      updateDataRef('herz', herz);

      let newFilteredItem = {
        value: pointLowPassFilter(prev.value, newItem, 1, herz),
        time: newItem.time,
      };
      updateDataRef('newFilteredItem', newFilteredItem);

      const peakIndexes = findPeaksP3(filteredData, cutOffFrequency);
      const peaks = peakIndexes.map((i) => filteredData[i]);
      updateDataRef('peaks', peaks);

      const windowSize = 30;
      const threshold = 0.6; // set a threshold for the correlation coefficient

      const correlationCoefficients = calculateCorrelation(filteredData, eyePointDistance, windowSize);

      const { filteredPeaks, removedPeaks } = peaks?.reduce(
        (result, peak) => {
          const correspondingCoefficient = correlationCoefficients?.find(
            (coefficient) => coefficient.time.getTime() === peak.time.getTime()
          );

          const text = correspondingCoefficient ? correspondingCoefficient.value.toFixed(2) : '';
          if (!correspondingCoefficient || correspondingCoefficient.value < threshold) {
            result.filteredPeaks.push({ ...peak, text });
          } else {
            result.removedPeaks.push({ ...peak, text });
          }

          return result;
        },
        { filteredPeaks: [], removedPeaks: [] }
      );
      updateDataRef('filteredPeaks', filteredPeaks);
      updateDataRef('removedPeaks', removedPeaks);

      updateDataRef('filteredData', [...filteredData.slice(-itemsNo), newFilteredItem]);
    }

    if (eyePoint) {
      const newEyePointDistance = {
        value: euclideanDistance(eyePoint.x, eyePoint.y),
        time: newItem.time,
      };
      updateDataRef('eyePointDistance', [
        ...eyePointDistance.slice(-itemsNo),
        newEyePointDistance,
      ]);
    }

    updateDataRef('data', [...data.slice(-itemsNo), newItem]);
  }, [animate]);

  return useMemo(() => {
    return {
      data: dataRef.current.data,
      filteredData: dataRef.current.filteredData,
      herz: dataRef.current.herz,
      peaks: dataRef.current.peaks,
      newFilteredItem: dataRef.current.newFilteredItem,
      eyePointDistance: dataRef.current.eyePointDistance,
      filteredPeaks: dataRef.current.filteredPeaks,
      removedPeaks: dataRef.current.removedPeaks,
    };
  }, [animate]);
}