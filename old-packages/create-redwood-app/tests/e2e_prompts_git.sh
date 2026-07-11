#!/usr/bin/expect

set projectPath $env(PROJECT_PATH)

if {$projectPath eq ""} {
    puts "PROJECT_PATH is not set"
    exit
}

cd $projectPath

set projectDirectory "redwood-app-prompt-git-test"

spawn yarn create-redwood-app --no-yarn-install --git

expect "Where would you like to create your Redwood app?"
send "$projectDirectory\n"

expect "Select your preferred language"
# ❯ TypeScript
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
