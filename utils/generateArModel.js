import fetch from "node-fetch";
import cloudinary from "./cloudinary.js";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";

export const imageToGLB = async (imageUrl) => {
    /* ----------------------------
     1. Fetch image buffer
  ----------------------------- */
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Failed to fetch image");

    const arrayBuffer = await res.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const mimeType = res.headers.get("content-type") || "image/jpeg";

    /* ----------------------------
     2. Create document
  ----------------------------- */
    const document = new Document();
    const buffer = document.createBuffer(); // Required for storing binary data
    const scene = document.createScene("Scene");

    /* ----------------------------
     3. ✅ CREATE IMAGE RESOURCE (KEY FIX)
  ----------------------------- */
    /* ----------------------------
     3. ✅ CREATE TEXTURE DIRECTLY
      (Fixes document.createImage error)
  ----------------------------- */
    const texture = document
        .createTexture("PlaneTexture")
        .setImage(imageBuffer)
        .setMimeType(mimeType);

    const material = document
        .createMaterial("PlaneMaterial")
        .setBaseColorTexture(texture)
        .setDoubleSided(true);

    /* ----------------------------
     4. Geometry (1m x 1m plane)
  ----------------------------- */
    const positions = new Float32Array([
        -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5,
    ]);

    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);

    const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

    const mesh = document.createMesh("PlaneMesh");

    mesh.addPrimitive(
        document
            .createPrimitive()
            .setAttribute(
                "POSITION",
                document
                    .createAccessor()
                    .setType(Accessor.Type.VEC3)
                    .setArray(positions)
            )
            .setAttribute(
                "TEXCOORD_0",
                document
                    .createAccessor()
                    .setType(Accessor.Type.VEC2)
                    .setArray(uvs)
            )
            .setIndices(
                document
                    .createAccessor()
                    .setType(Accessor.Type.SCALAR)
                    .setArray(indices)
            )
            .setMaterial(material)
    );

    scene.addChild(document.createNode("PlaneNode").setMesh(mesh));

    /* ----------------------------
     5. Export GLB (works now)
  ----------------------------- */
    const io = new NodeIO();
    const glbUint8 = await io.writeBinary(document);
    const glbBuffer = Buffer.from(glbUint8);

    /* ----------------------------
     6. Upload to Cloudinary
  ----------------------------- */
    const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    resource_type: "raw",
                    folder: "ar-models",
                    format: "glb",
                },
                (err, result) => (err ? reject(err) : resolve(result))
            )
            .end(glbBuffer);
    });

    return uploadResult.secure_url;
};
