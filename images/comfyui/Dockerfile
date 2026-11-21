FROM nvidia/cuda:13.0.2-runtime-ubuntu24.04@sha256:6a0e31b59e70890446f2c17356d6efc0d54260090a8c63d6ca7c2ad049db95d2

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-dev gcc libc6-dev git ca-certificates libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu130

RUN git clone --depth 1 https://github.com/Comfy-Org/ComfyUI.git /app \
    && pip install -r /app/requirements.txt huggingface_hub

WORKDIR /app

EXPOSE 8188

ENTRYPOINT ["sh", "-c", "mkdir -p /data/models /data/output /data/input /data/user /data/custom_nodes && exec python main.py --listen 0.0.0.0 --port 8188 --base-directory /data \"$@\"", "comfyui"]
