
export interface DatasetSample {
  name: string;
  url: string;
  type: "Normal" | "Diseased";
  description: string;
}

export const KAGGLE_SAMPLES: DatasetSample[] = [
  {
    name: "Normal Baseline (Sample 1)",
    url: "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/NORMAL2-IM-1427-0001.jpeg",
    type: "Normal",
    description: "Verified clear pediatric lung fields from Mooney's Mooney's chest X-ray corpus."
  },
  {
    name: "Pneumonia Detection (Sample 2)",
    url: "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/person1946_bacteria_4874.jpeg",
    type: "Diseased",
    description: "Pediatric pneumonia case exhibiting bacterial opacification and focal consolidation."
  },
  {
    name: "Viral Manifestation (Sample 3)",
    url: "https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/person1950_bacteria_4881.jpeg",
    type: "Diseased",
    description: "Advanced bacterial pneumonia sample showing extensive bilateral lung involvement."
  }
];
