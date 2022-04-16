package system.authz

default allow = false

allow = true {
  "client" == trim_prefix(input.identity, "CN=")
}
