package rules

default allow = false

allow = true {
  input.user == "alice"
}
