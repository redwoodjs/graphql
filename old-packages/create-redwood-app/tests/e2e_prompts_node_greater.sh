#!/usr/bin/expect

# You have to set your Node version to 21+ before running this test.

set projectPath $env(PROJECT_PATH)

if {$projectPath eq ""} {
    puts "PROJECT_PATH is not set"
    exit
}

cd $projectPath

set projectDirectory "redwood-app-prompt-node-greater-test"

spawn yarn create-redwood-app --no-yarn-install

expect "How would you like to proceed?"
# ❯ Override error and continue install
send "\n"

expect "Where would you like to create your Redwood app?"
send "$projectDirectory\n"

expect "Select your preferred language"
# ❯ TypeScript
send "\n"

expect "Do you want to initialize a git repo?"
# ❯ Yes
send "\n"

expect "Enter a commit message"
send "first\n"

expect eof
catch wait result
set exitStatus [lindex $result 3]

if {$exitStatus == 0} {
    puts "Success"
    exec rm -rf $projectDirectory
    exit 0
} else {
    puts "Error: The process failed with exit status $exitStatus"
    exec rm -rf $projectDirectory
    exit 1
}
