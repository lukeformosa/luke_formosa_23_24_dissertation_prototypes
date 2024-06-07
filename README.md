# luke_formosa_23_24_dissertation_prototypes
 This repository contains all of the code used in my research, titled:
 ##### Using a Self-Calibrating Gaze Estimator to Measure UI Effectiveness in Local Banking Websites

## Contents:
### Chrome Extension (Main Prototype)
### Data Visualisation & Analysis Python Scripts
### Visualisations and Performance Tables
### All Raw Data Collected in JSON Format

### Additional Information for Further Use:
The chrome extension has two modes, simple and advanced.

 - Simple (default), will allow users to start an experiment straight away by clicking the extension and following instructions.
 - Advanced, allows users to use the exntesion with more control, allow additional features like saving, loading and clearing the current model.

To switch modes, go into the "chrome-extension > global > gazetimator-variables.js" script, and change the GAZETIMATOR_MODE variable's value to "simple" or "advanced".