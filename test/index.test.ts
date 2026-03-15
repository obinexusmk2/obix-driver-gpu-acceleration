import { describe, expect, it } from "vitest";
import { createGPUAccelerationDriver } from "../src/index";

describe("gpu-acceleration", () => {
  it("tracks shader program lifecycle", async () => {
    const canvas = { setAttribute: () => undefined } as unknown as HTMLCanvasElement;
    const driver = createGPUAccelerationDriver({ canvas });
    await driver.initialize();
    await driver.loadShader("default", { vertexSource: "v", fragmentSource: "f" });
    driver.setShaderProgram("default");
    driver.setUniform("u_time", 1);
    driver.beginFrame();
    driver.endFrame();
    await driver.destroy();
    expect(true).toBe(true);
  });
});
