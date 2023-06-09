import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { getMesh } from "../utils/utilities";
import * as facemesh from "@tensorflow-models/face-landmarks-detection";


export const useFaceMesh = (videoRef) => {
    const effectRan = useRef(false);
    const [animate, setAnimate] = useState(false);
    const meshDataRef = useRef({
        euclideanDistance: null,
        eyePoint: null,
        namedKeypoints: null,
    });

    const UPDATE_MS = 20;

    const runFacemesh = useCallback(async () => {
        const detect = async (net) => {
            if (
                // check if webcam works, and we receive data
                typeof videoRef.current !== "undefined" &&
                videoRef.current !== null &&
                videoRef.current.readyState === 4
            ) {
                // Get Video Properties
                const video = videoRef.current;

                const face = await net.estimateFaces(video);

                if (face) {
                    const { euclideanDistance, eyePoint, namedKeypoints } = getMesh(face);
                    meshDataRef.current = {
                        euclideanDistance,
                        eyePoint,
                        namedKeypoints
                    }
                    setAnimate(prevCheck => !prevCheck);
                }
            }
        };
        const detectorConfig = {
            runtime: 'mediapipe', // or 'tfjs'
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        }


        const detector = await facemesh.createDetector(facemesh.SupportedModels.MediaPipeFaceMesh, detectorConfig);
        await detector.initialize();
        //   setDetector(detector);

        setInterval(() => {
            detect(detector);
        }, UPDATE_MS);
    }, []);



    useEffect(() => {
        if (effectRan.current === false) {
            runFacemesh()
        }

        return () => {
            effectRan.current = true;
        };
    }, []);


    return useMemo(() => {
        return {
            animate: animate,
            euclideanDistance: meshDataRef.current.euclideanDistance,
            eyePoint: meshDataRef.current.eyePoint,
            namedKeypoints: meshDataRef.current.namedKeypoints
        }
    }, [animate]);
}