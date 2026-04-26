workspace(name = "nexus")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Rules Rust
http_archive(
    name = "rules_rust",
    sha256 = "9d04e658878d23f4b00163a71212eb70d482004fce51c518aa2f8c5c76c5b967",
    urls = ["https://github.com/bazelbuild/rules_rust/releases/download/0.42.1/rules_rust-v0.42.1.tar.gz"],
)

load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")

rules_rust_dependencies()
rust_register_toolchains(
    edition = "2021",
    versions = ["1.77.0"],
)

# Rules Proto
http_archive(
    name = "rules_proto",
    sha256 = "dc3fb206a2cb3441b485eb1e423165b231235a1ea9b031b4433fac7ac968321d",
    strip_prefix = "rules_proto-5.3.0-21.7",
    urls = [
        "https://github.com/bazelbuild/rules_proto/archive/refs/tags/5.3.0-21.7.tar.gz",
    ],
)

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")
rules_proto_dependencies()
rules_proto_toolchains()

# Rules Java
http_archive(
    name = "rules_java",
    urls = [
        "https://github.com/bazelbuild/rules_java/releases/download/7.6.1/rules_java-7.6.1.tar.gz",
    ],
    sha256 = "c08271af427a1a0d33e7dcabf4d7f573d82a17f63116deec4a9057b54630a4b9",
)
