####################################
# Build stage
####################################
FROM rust:latest AS builder

ARG DISCORD_TOKEN

RUN apt-get update && apt-get install -y cmake pkg-config build-essential && rm -rf /var/lib/apt/lists/*

RUN USER=root cargo new --bin app
WORKDIR /app

# Cache dependencies by building an empty project first
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release
RUN rm -f src/*.rs target/release/deps/discordmusic*

COPY src ./src
RUN cargo build --release

####################################
# Final
####################################
FROM debian:buster-slim AS runtime

# Install required runtime dependencies and yt-dlp
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates libopus0 python3 ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/discordmusic /usr/local/bin/discordmusic

ENTRYPOINT ["/usr/local/bin/discordmusic"]
ENV DISCORD_TOKEN=${DISCORD_TOKEN}
