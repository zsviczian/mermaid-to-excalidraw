//import mermaid from "mermaid"; //zsviczian
import { GraphImage } from "./interfaces.js";
//import { DEFAULT_FONT_SIZE } from "./constants.js"; //zsviczian
import { encodeEntities } from "./utils.js";
import { Flowchart, parseMermaidFlowChartDiagram } from "./parser/flowchart.js";
import { Sequence, parseMermaidSequenceDiagram } from "./parser/sequence.js";
import { Class, parseMermaidClassDiagram } from "./parser/class.js";
import { replaceSVGStyle } from "./obsidianUtil.js"; //zsviczian
import { MermaidOptions } from "./index.js";
import { DEFAULT_FONT_SIZE } from "./constants.js";

declare global { //zsviczian
  interface Window {
    mermaid: any;
  }
}

// Fallback to Svg
const convertSvgToGraphImage = (svgContainer: HTMLDivElement) => {
  // Extract SVG width and height
  // TODO: make width and height change dynamically based on user's screen dimension
  const svgEl = svgContainer.querySelector("svg");
  if (!svgEl) {
    throw new Error("SVG element not found");
  }
  const rect = svgEl.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Set width and height explictly since in firefox it gets set to 0
  // if the width and height are not expilcitly set
  // eg in some cases like er Diagram, gnatt, width and height is set as 100%
  // which sets the dimensions as 0 in firefox and thus the diagram isn't rendered
  svgEl.setAttribute("width", `${width}`);
  svgEl.setAttribute("height", `${height}`);

  // Convert SVG to image
  const mimeType = "image/svg+xml";
  const decoded = unescape(encodeURIComponent(svgEl.outerHTML));
  const base64 = btoa(decoded);
  const dataURL = `data:image/svg+xml;base64,${base64}`;

  const graphImage: GraphImage = {
    type: "graphImage",
    mimeType,
    dataURL,
    width,
    height,
  };

  return graphImage;
};

export const parseMermaid = async (
  definition: string,
  forceSVG: boolean = false, //zsviczian
  options: MermaidOptions = {}, //zsviczian
): Promise<Flowchart | GraphImage | Sequence | Class> => {
  const existingConfig = window.mermaid.mermaidAPI.getConfig();//zsviczian
  const curve = existingConfig.flowchart.curve; //zsviczian
  const fontSize = existingConfig.themeVariables.fontSize; //zsviczian
  window.mermaid.initialize({
    //startOnLoad: false, //zsviczian
    flowchart: { curve: "linear" },
    themeVariables: {
      fontSize: `${(options?.fontSize || DEFAULT_FONT_SIZE) * 1.25}px`,
    },
  });

  const diagram = await window.mermaid.mermaidAPI.getDiagramFromText( //zsviczian
    encodeEntities(definition)
  );

  // Render the SVG diagram
  const { svg } = await window.mermaid.render("mermaid-to-excalidraw", definition); //zsviczian

  
  window.mermaid.initialize({ flowchart: { curve }, themeVariables: { fontSize} }); //zsviczian
  // Append Svg to DOM
  const svgContainer = document.createElement("div");
  svgContainer.setAttribute(
    "style",
    `opacity: 0; position: relative; z-index: -1;`
  );
  svgContainer.innerHTML = replaceSVGStyle(svg, diagram.type); //zsviczian
  svgContainer.id = "mermaid-diagram";
  document.body.appendChild(svgContainer);

  if(forceSVG) return convertSvgToGraphImage(svgContainer); //zsviczian
  let data;
  switch (diagram.type) {
    case "flowchart-v2": {
      data = parseMermaidFlowChartDiagram(diagram, svgContainer);
      break;
    }

    case "sequence": {
      data = parseMermaidSequenceDiagram(diagram, svgContainer);

      break;
    }

    case "classDiagram": {
      data = parseMermaidClassDiagram(diagram, svgContainer);
      break;
    }
    // fallback to image if diagram type not-supported
    default: {
      data = convertSvgToGraphImage(svgContainer);
    }
  }
  svgContainer.remove();

  return data;
};
