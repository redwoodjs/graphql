#!/usr/bin/expect

set projectPath $env(PROJECT_PATH)

if {$projectPath eq ""} {
    puts "PROJECT_PATH is not set"
    exit
}

cd $projectPath

# Make directory that needs to be overwritten.
set projectDirectory "redwood-app-prompt-overwrite-test"
exec mkdir $projectDirectory
exec touch $projectDirectory/README.md

spawn yarn create-redwood-app --no-yarn-install

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

expect "How would you like to proceed?"
# ❯ Quit install
send "\n"

expect eof
catch wait result
set exitStatus [lindex $result 3]

if {$exitStatus == 1} {
    puts "Success"
    exec rm -rf $projectDirectory
    exit 0
} else {
    puts "Error: The process failed with exit status $exitStatus"
    exec rm -rf $projectDirectory
    exit 1
}
