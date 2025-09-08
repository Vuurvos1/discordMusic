####################################
# Build stage
####################################
FROM rust:1.89-alpine AS builder

RUN apk add --no-cache \
    musl-dev \
    cmake \
    make \
    gcc \
    g++ \
    pkgconfig \
    openssl-dev \
    openssl-libs-static \
    opus-dev \
    opus \
    alsa-lib-dev

WORKDIR /app

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./

# Set build optimizations with memory constraints
ENV CARGO_BUILD_JOBS=1
ENV RUSTFLAGS="-C opt-level=2 -C codegen-units=1 -C target-feature=-crt-static"

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer will be cached unless Cargo.toml/Cargo.lock changes)
RUN cargo build --release && \
    rm -rf src target/release/deps/discordmusic*

COPY src ./src

# Build the actual application
RUN cargo build --release && \
    strip target/release/discordmusic

####################################
# Runtime stage
####################################
FROM alpine:3.19 AS runtime

# Install runtime dependencies and yt-dlp from Alpine repository
RUN apk add --no-cache \
    ca-certificates \
    openssl \
    opus \
    ffmpeg \
    yt-dlp

# Create non-root user for security
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser

# Copy the binary from builder stage
COPY --from=builder /app/target/release/discordmusic /usr/local/bin/discordmusic

# Set proper permissions
RUN chmod +x /usr/local/bin/discordmusic

# Switch to non-root user
USER appuser

# Environment variables will be provided at runtime

ENTRYPOINT ["/usr/local/bin/discordmusic"]
